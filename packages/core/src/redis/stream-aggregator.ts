// Original source  https://github.com/erulabs/redis-streams-aggregator
import pAll from 'p-all';
import Emittery, { UnsubscribeFn } from 'emittery';
import { parseObjectResponse, toKeyValueList } from './utils';
import { getStreamDeserializer } from './streams';
import { createDebug, delay } from '../lib';
import { RedisClient, RedisConnection, ConnectionOptions } from 'bullmq';
import { logger } from '../logger';

const debug = createDebug('stream-aggregator');

export interface AggregatorSerializeFunc {
  (reply: any): any;
}

export interface AggregatorDeserializeFunc {
  (reply: any): any;
}

export interface SubscriberInfo {
  cursor: string;
  serialize: AggregatorSerializeFunc;
  deserialize: AggregatorDeserializeFunc;
}

function createDeserializer(
  key: string,
  defaultFn: AggregatorDeserializeFunc = parseObjectResponse,
): AggregatorDeserializeFunc {
  const deserializer = getStreamDeserializer(key);
  if (deserializer) {
    return (msg): any => {
      if (msg) {
        msg = parseObjectResponse(msg);
        msg = deserializer(msg);
      }
      return msg;
    };
  } else {
    return defaultFn;
  }
}

export interface RedisStreamAggregatorOptions {
  connection?: ConnectionOptions;
  serialize: AggregatorSerializeFunc;
  deserialize: AggregatorDeserializeFunc;
  // Amount of time to wait on XREAD - ideally we call client UNBLOCK on-demand,
  // so this tunable shouldn't really matter much
  blockingInterval: number;
}

const defaultOptions: RedisStreamAggregatorOptions = {
  serialize: toKeyValueList,
  deserialize: parseObjectResponse,
  // Amount of time to wait on XREAD - ideally we call client UNBLOCK on-demand,
  // so this tuneable shouldn't really matter much
  blockingInterval: 10000,
};

export type EventHandler = (eventData: [string, unknown]) => void | Promise<void>;

export class RedisStreamAggregator {
  private readonly subscriptions: Map<string, SubscriberInfo> = new Map();
  private readonly options: RedisStreamAggregatorOptions = defaultOptions;
  private readonly events: Emittery;
  private isClosing = false;
  private _readId?: string = null;
  private readStreamActive: boolean;
  private isSubscribing = false;
  private isConnecting = false;
  private handles: {
    read: RedisConnection;
    write: RedisConnection;
  };
  private initializing: Promise<void>;
  private _readClient: RedisClient;
  private _writeClient: RedisClient;

  constructor(options?: Partial<RedisStreamAggregatorOptions>) {
    // Indicates if the read stream is currently blocked by an XREAD call
    this.readStreamActive = false;
    this.events = new Emittery();
    this._readId = null;
    this.options = {
      ...defaultOptions,
      ...(options || {}),
    };

    this.handleError = this.handleError.bind(this);
    this.events.on(Emittery.listenerRemoved, ({ eventName }) => {
      const id = eventName;
      if (typeof id === 'string') {
        if (this.events.listenerCount(id) < 1) {
          this.subscriptions.delete(id);
          if (this.subscriptions.size === 0) {
            this.unblock().catch(this.handleError);
          }
        }
      }
    });

    this.initializing = this.connect();
  }

  waitUntilReady(): Promise<void> {
    return this.initializing;
  }

  destroy(): Promise<void> {
    return this.disconnect().catch((err) => {
      logger.warn(err);
    });
  }

  get readClient(): RedisClient {
    return this._readClient;
  }

  get writeClient(): RedisClient {
    return this._writeClient;
  }

  get readId(): string {
    return this._readId;
  }

  get isReady(): boolean {
    return this._readId !== null;
  }

  get isClosed(): boolean {
    return !this._writeClient && !this._readClient;
  }

  protected handleError(err: Error): void {
    logger.error(err);
  }

  async add(id: string, content: any, msgId = '*'): Promise<string> {
    const body =
      typeof content === 'object'
        ? this.options.serialize(content)
        : ['data', content];
    debug(`XADD ${id} ${msgId} %o`, body);
    const client = await this.handles.write.client;
    return client.xadd(id, msgId, ...body);
  }

  async disconnect(): Promise<void> {
    if (this.isClosing) {
      return;
    }
    this.isClosing = true;
    await this.unblock();
    this._readId = null;

    await Promise.all([
      this.handles.read.disconnect(),
      this.handles.write.disconnect(),
    ]);

    this._readClient = null;
    this._writeClient = null;

    this.events.emit('disconnect', this);
    this.events.clearListeners();
  }

  async unblock(): Promise<any> {
    debug(`unblocking ${this._readId}`);
    this.readStreamActive = false;
    const client = await this.handles.write.client;
    const val = await client.client('unblock', this._readId);
  }

  /***
   * Subscribe to a redis stream
   * @param id {String} the id of the stream
   * @param offset {String} the stream offset
   * @param handler {EventHandler} handler for stream messages
   * @returns {Promise<Object>}
   */
  async subscribe(
    id: string,
    handler: EventHandler,
    offset = '$',
  ): Promise<SubscriberInfo> {
    debug('Pre-Subscribe %O', { subscriptions: this.subscriptions, id });

    // Emittery de-dupes listeners, so placing this here is fine
    this.events.on(id, handler);

    let subscriberInfo = this.subscriptions.get(id);
    if (!subscriberInfo) {
      const deserialize = createDeserializer(id, this.options.deserialize);
      subscriberInfo = {
        cursor: offset,
        serialize: this.options.serialize,
        deserialize,
      };

      this.subscriptions.set(id, subscriberInfo);
      this.isSubscribing = true;
      try {
        if (this.readStreamActive) await this.unblock();
      } finally {
        this.isSubscribing = false;
      }
      if (!this.readStreamActive) {
        this.readStream().catch((err) => {
          logger.warn(err);
        });
      }
    }

    return subscriberInfo;
  }

  /***
   * Unsubscribe from a redis stream
   * @param {String | String[]} id the stream id
   * @param onEvent {EventHandler} a previously registered handler for the stream
   */
  unsubscribe(id: string | string[], onEvent: EventHandler): void {
    this.events.off(id, onEvent);
  }

  isSubscribed(id: string): boolean {
    return !!this.subscriptions.get(id);
  }

  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  on(event: string, listener: EventListener): UnsubscribeFn {
    return this.events.on(event, listener);
  }

  getSubscription(id: string): SubscriberInfo {
    return this.subscriptions.get(id);
  }

  protected async readStream(): Promise<void> {
    const client = await this.handles.read.client;

    while (client && !this.isSubscribing && !this.isClosing) {
      if (!this._readId) return;

      this.readStreamActive = true;
      const streamIds = [];
      const streamOffsets = [];
      for (const [id, info] of this.subscriptions.entries()) {
        streamIds.push(id);
        streamOffsets.push(info.cursor);
      }
      if (streamIds.length < 1) return;
      debug(`XREAD BLOCK ${this.options.blockingInterval} STREAMS`, [
        ...streamIds,
        ...streamOffsets,
      ]);

      let messages;
      try {
        messages = await client.xread(
          'BLOCK',
          this.options.blockingInterval,
          'STREAMS',
          ...streamIds,
          ...streamOffsets,
        );
      } catch (err) {
        // If the connection is closed during an xread, thats okay, we'll just not
        // emit any message events, which is what one would expect. Errors and close
        // events are forwarded to the user via the events emitter
        if (err.message !== 'Connection is closed.') throw err;

        await delay(2000);
      }
      this.readStreamActive = false;
      if (messages) {
        const calls = [];

        for (let i = 0; i < messages.length; i++) {
          const streamId = messages[i][0];
          const info = this.subscriptions.get(streamId);
          if (info) {
            const eventMessagesRaw = messages[i][1];
            const eventMessages = eventMessagesRaw.map((r) => {
              const data = info.deserialize(r[1]);
              return [r[0], data];
            });
            info.cursor = eventMessages[eventMessages.length - 1][0];

            eventMessages.forEach((msg) => {
              calls.push(() => this.events.emit(streamId, msg));
            });
          }
        }

        if (calls.length > 0) {
          await pAll(calls, { concurrency: 6 });
        }

      }

    }

  }

  connect(): Promise<void> {
    this.initializing = new Promise(async (resolve, reject) => {
      if (this.isClosing || (this._readClient && this._writeClient)) {
        return resolve();
      }

      this.isConnecting = true;

      // Create redis read & write handles with debuggable connection names
      const r = `${Math.floor(Math.random() * 10000000)}`;
      const readName = `aggregator:read:${r}`;
      const writeName = `aggregator:write:${r}`;

      const read = new RedisConnection({
        skipVersionCheck: true,
        connectionName: readName,
        ...this.options.connection,
      });

      const write = new RedisConnection({
        skipVersionCheck: true,
        connectionName: writeName,
        ...this.options.connection,
      });

      this.handles = {
        read,
        write,
      };
      debug('RedisStreamsAggregator() %O', {
        ...this.options,
        readName,
        writeName,
      });

      write.on('error', (err) => {
        this.handleError(err);
        console.error('RedisStreamsAggregator write handle error:', err);
        reject(err);
      });

      read.on('error', (err) => {
        this.handleError(err);
        console.error('RedisStreamsAggregator read handle error:', err);
        reject(err);
      });

      const [readClient, writeClient] = await Promise.all([
        read.client,
        write.client,
      ]);

      this._readClient = readClient;
      this._writeClient = writeClient;

      // We need to retrieve the read connections "client id" so that we can call
      // CLIENT UNBLOCK on it later
      if (readClient) {
        this._readId = await readClient.client('id');
      }

      resolve();

      this.events.emit('ready', true).catch(this.handleError);
    });


    this.initializing.catch(this.handleError);

    this.initializing.finally(() => {
      this.isConnecting = false;
    });

    return this.initializing;
  }
}
