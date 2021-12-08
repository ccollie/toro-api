// Original source  https://github.com/erulabs/redis-streams-aggregator
import { Redis } from 'ioredis';
import IORedis from 'ioredis';
import pAll from 'p-all';
import Emittery from 'emittery';
import {
  parseObjectResponse,
  toKeyValueList,
  disconnect,
  ConnectionOptions,
} from './utils';
import { getStreamDeserializer } from './streams';
import { createDebug } from '../lib';
import { RedisClient } from 'bullmq';
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
  connectionOptions: ConnectionOptions;
  lazyConnect: boolean;
  serialize: AggregatorSerializeFunc;
  deserialize: AggregatorDeserializeFunc;
  // Amount of time to wait on XREAD - ideally we call client UNBLOCK on-demand,
  // so this tunable shouldn't really matter much
  blockingInterval: number;
  redisOptions: { showFriendlyErrorStack: boolean };
}

const defaultOptions: RedisStreamAggregatorOptions = {
  connectionOptions: 'localhost:6379',
  lazyConnect: false,
  serialize: toKeyValueList,
  deserialize: parseObjectResponse,
  // Amount of time to wait on XREAD - ideally we call client UNBLOCK on-demand,
  // so this tuneable shouldn't really matter much
  blockingInterval: 1000,
  redisOptions: { showFriendlyErrorStack: true },
};

export type EventHandler = (eventData?: unknown) => void;

export class RedisStreamAggregator {
  private readonly subscriptions: Map<string, SubscriberInfo>;
  private readonly options: RedisStreamAggregatorOptions = defaultOptions;
  private readonly events: Emittery;
  private calledDisconnect: boolean;
  private readId?: string = null;
  private readStreamActive: boolean;
  private handles: {
    writeName: string;
    readName: string;
    read: Redis;
    write: Redis;
  };

  constructor(options?: Partial<RedisStreamAggregatorOptions>) {
    // Stores a list of subscriptions by subscription key, with the value as
    // {subscribers, offset}
    this.subscriptions = new Map();
    // Indicates if the read stream is currently blocked by an XREAD call
    this.readStreamActive = false;
    this.events = new Emittery();
    this.readId = null;
    this.calledDisconnect = false;
    this.options = {
      ...defaultOptions,
      ...(options || {}),
    };

    // Create redis read & write handles with debuggable connection names
    const r = `${Math.floor(Math.random() * 10000000)}`;
    const readName = `read:${r}`;
    const writeName = `write:${r}`;
    this.handles = {
      read: new IORedis(
        Object.assign(this.options, { connectionName: readName }),
      ),
      write: new IORedis(
        Object.assign(this.options, { connectionName: writeName }),
      ),
      readName,
      writeName,
    };
    debug('RedisStreamsAggregator() %O', {
      ...this.options,
      readName,
      writeName,
    });

    // We need to retrieve the read connections "client id" so that we can call
    // CLIENT UNBLOCK on it later
    const getReadClientId = (): any => {
      if (
        this.handles.read.status === 'connect' &&
        this.handles.write.status === 'connect'
      ) {
        this.handles.read.client('id').then((id) => {
          this.readId = id;
          return this.events.emit('ready', true);
        }).catch((err) => {
          logger.warn(err);
        });
      }
    };

    this.handles.write.on('connect', getReadClientId);
    this.handles.read.on('connect', getReadClientId);

    this.handles.write.on('error', (err) => {
      logger.warn(err);
      console.error('RedisStreamsAggregator write handle error:', err);
    });
    this.handles.read.on('error', (err) => {
      logger.warn(err);
      console.error('RedisStreamsAggregator read handle error:', err);
    });

    this.events.on(Emittery.listenerRemoved, ({ eventName }) => {
      const id = eventName;
      if (typeof id === 'string') {
        if (this.events.listenerCount(id) < 1) {
          this.subscriptions.delete(id);
        }
      }
    });

    return this;
  }

  destroy(): Promise<void> {
    return this.disconnect().catch((err) => {
      logger.warn(err);
    });
  }

  get readClient(): RedisClient {
    return this.handles.read;
  }

  get writeClient(): RedisClient {
    return this.handles.write;
  }

  add(id: string, content: any, msgId = '*'): Promise<string> {
    const body =
      typeof content === 'object'
        ? this.options.serialize(content)
        : ['data', content];
    debug(`XADD ${id} ${msgId} %o`, body);
    return this.handles.write.xadd(id, msgId, ...body);
  }

  async disconnect(): Promise<void> {
    this.calledDisconnect = true;
    this.events.clearListeners();
    await this.unblock();
    this.readId = null;

    await Promise.all([
      await disconnect(this.handles.read).then(() =>
        debug('Read handle disconnected'),
      ),
      await disconnect(this.handles.write).then(() =>
        debug('Write handle disconnected'),
      ),
    ]);
  }

  unblock(): Promise<any> {
    debug(`unblocking ${this.readId}`);
    this.readStreamActive = false;
    return this.handles.write.client('unblock', this.readId);
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
      if (this.readStreamActive) await this.unblock();
      await this.readStream();
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

  getSubscription(id: string): SubscriberInfo {
    return this.subscriptions.get(id);
  }

  async readStream(): Promise<void> {
    if (typeof this.readId !== 'number') return;

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

    await this.connect();

    let messages;
    try {
      messages = await this.handles.read.xread(
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

      await pAll(calls, { concurrency: 6 });
    }
    await this.readStream();
  }

  connect(): Promise<void> {
    return new Promise(async (resolve) => {
      if (
        this.calledDisconnect ||
        (this.handles.read.status === 'ready' &&
          this.handles.write.status === 'ready')
      ) {
        return resolve();
      }

      const happyStates = ['connect', 'connecting', 'ready'];
      const readConnecting = happyStates.includes(this.handles.read.status);
      const writeConnecting = happyStates.includes(this.handles.write.status);
      debug('Connecting %o', {
        readStatus: this.handles.read.status,
        writeStatus: this.handles.write.status,
      });

      const calls = [];
      if (!writeConnecting) {
        calls.push(() => this.handles.write.connect());
      }
      if (!readConnecting) {
        calls.push(() => this.handles.read.connect());
      }
      if (calls.length) {
        await pAll(calls);
      }
      // TODO: Bind errors and reject the connect promise
      this.events.on('ready', () => resolve());
    });
  }
}
