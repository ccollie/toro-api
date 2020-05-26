import { Queue } from 'bullmq';
import { getQueueBusKey } from '../keys';
import Emittery from 'emittery';
import { RedisStreamAggregator, toKeyValueList } from '../../redis';
import { Pipeline, Redis } from 'ioredis';
import nanoid from 'nanoid';

const SENDER_ID_KEY = '__sid';

function baseEmit(client, key, event, data) {
  return client.xadd(key, '*', 'event', event, ...toKeyValueList(data));
}

export interface BusEventHandler {
  (eventData?: unknown): void;
}

/**
 * An event bus for our queues
 * @property {RedisStreamAggregator} aggregator
 */
export class QueueBus {
  private readonly aggregator: RedisStreamAggregator;
  private readonly host: string;
  private readonly _key: string;
  private readonly _emitter: Emittery;
  private readonly _senderId = nanoid(6);
  private readonly queue: Queue;
  private readonly lastEventId: string;
  private _isSubscribed: boolean;
  private _wrappedHandlers: Map<BusEventHandler, BusEventHandler>;

  /**
   * Construct a {@link QueueBus}
   * @param {RedisStreamAggregator} aggregator stream aggregator
   * @param {Queue} queue
   * @param {String} host the queue host name
   * @param {String} [lastEventId="$"] the start for the stream cursor
   */
  constructor(
    aggregator: RedisStreamAggregator,
    queue: Queue,
    host: string,
    lastEventId = '$',
  ) {
    this.aggregator = aggregator;
    this.queue = queue;
    this.host = host;
    this.lastEventId = lastEventId;
    this._key = getQueueBusKey(queue);
    this._isSubscribed = false;
    this._onBusMessage = this._onBusMessage.bind(this);
    this._emitter = new Emittery();
    this._wrappedHandlers = new Map<BusEventHandler, BusEventHandler>();
  }

  destroy(): void {
    this._emitter.clearListeners();
    this.unsubscribe();
  }

  private get client(): Redis {
    return this.aggregator.writeClient;
  }

  /**
   * Stop listening for messages related to the queue
   */
  unsubscribe(): void {
    if (this._isSubscribed) {
      this.aggregator.unsubscribe(this._key, this._onBusMessage);
      this._isSubscribed = false;
    }
  }

  async on(event: string, handler: BusEventHandler): Promise<Function> {
    if (!this._isSubscribed) {
      const id = this.lastEventId || '$';
      await this.aggregator.subscribe(this._key, id, this._onBusMessage);
      this._isSubscribed = true;
    }
    if (!this._wrappedHandlers.get(handler)) {
      const host = this.host;
      const queue = this.queue;

      const wrapper = (data = {}) => {
        const eventData = {
          host,
          queue,
          ...data,
        };
        return handler(eventData);
      };

      this._wrappedHandlers.set(handler, wrapper);
      this._emitter.on(event, wrapper);
    }

    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe an event handler from an event
   * @param {String} event name
   * @param {BusEventHandler} handler the event handler
   */
  off(event: string, handler: BusEventHandler): void {
    const wrapper = this._wrappedHandlers.get(handler);
    this._emitter.off(event, wrapper);
    if (this._emitter.listenerCount() === 0) {
      this.unsubscribe();
    }
  }

  async emit(event: string, data = {}): Promise<void> {
    const eventData = this._formatData(data);
    await baseEmit(this.client, this._key, event, eventData);
    return this._localEmit(event, data);
  }

  pipelineEmit(pipeline, event, data): Pipeline {
    // todo: if we pipeline, do we also local emit ?
    const eventData = this._formatData(data);
    return baseEmit(pipeline, this._key, event, eventData);
  }

  cleanup(maxLen = 1000): Promise<number> {
    return this.client.xtrim(this._key, 'MAXLEN', '~', maxLen);
  }

  private _formatData(data = {}): any {
    return { [SENDER_ID_KEY]: this._senderId, ...data };
  }

  private _localEmit(event, data): Promise<void> {
    return this._emitter.emit(event, data);
  }

  /**
   * @private
   * @param data
   * @return {Promise<void>}
   */
  private _onBusMessage(data): Promise<void> {
    if (data) {
      const { event, ...rest } = data;
      if (data[SENDER_ID_KEY] !== this._senderId) {
        return this._localEmit(event, rest);
      }
    }
  }
}
