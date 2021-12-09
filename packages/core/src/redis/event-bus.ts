import Emittery from 'emittery';
import { RedisStreamAggregator, SubscriberInfo } from './stream-aggregator';
import { Pipeline } from 'ioredis';
import { IteratorOptions, createAsyncIterator, nanoid } from '../lib';
import { RedisClient } from 'bullmq';
import { safeParse } from '@alpen/shared';
import { parseObjectResponse, toKeyValueList } from './utils';
import { isEmpty } from 'lodash';

const SENDER_ID_KEY = '__sid';
const EVENT_KEY = '__evt';

function baseEmit(
  client: Pipeline | RedisClient,
  key: string,
  event: string,
  data,
) {
  return client.xadd(key, '*', EVENT_KEY, event, ...toKeyValueList(data));
}

export interface BusEventHandler {
  (eventData?: unknown, isLocal?: boolean): void;
}

export type UnsubscribeFn = () => void;

/**
 * An event bus backed by redis streams
 * @property {RedisStreamAggregator} aggregator
 */
export class EventBus {
  private readonly aggregator: RedisStreamAggregator;
  private readonly _key: string;
  private readonly _emitter: Emittery;
  private readonly _senderId = nanoid();
  private _lastEventId: string;
  private _subscriptionInfo: SubscriberInfo;

  /**
   * Construct a {@link EventBus}
   * @param {RedisStreamAggregator} aggregator stream aggregator
   * @param {String} key
   */
  constructor(
    aggregator: RedisStreamAggregator,
    key: string
  ) {
    this.aggregator = aggregator;
    this._lastEventId = '$';
    this._key = key;
    this._onBusMessage = this._onBusMessage.bind(this);
    this._emitter = new Emittery();
    this._emitter.on(Emittery.listenerAdded, async () => {
      await this.subscribeIfNeeded();
    });
    this._emitter.on(Emittery.listenerRemoved, () => {
      this.unsubscribeIfNeeded();
    });
  }

  destroy(): void {
    this._emitter.clearListeners();
    this.unsubscribe();
  }

  waitUntilReady(): Promise<void> {
    return this.aggregator.waitUntilReady().then(() => {
      return this.subscribeIfNeeded();
    });
  }

  get client(): RedisClient {
    return this.aggregator.writeClient;
  }

  get key(): string {
    return this._key;
  }

  get lastId(): string {
    return this._lastEventId || '$';
  }

  private get subscriptionInfo(): SubscriberInfo {
    return (
      this._subscriptionInfo ||
      (this._subscriptionInfo = this.aggregator.getSubscription(this.key))
    );
  }

  private get isSubscribed(): boolean {
    return !!this.subscriptionInfo;
  }

  private async subscribeIfNeeded(): Promise<void> {
    if (!this.isSubscribed) {
      this._subscriptionInfo = await this.aggregator.subscribe(
        this.key,
        this._onBusMessage,
      );
    }
  }

  private unsubscribeIfNeeded(): void {
    if (this._emitter.listenerCount() === 0) {
      this.unsubscribe();
    }
  }

  /**
   * Stop listening for messages related to the event bus
   */
  private unsubscribe(): void {
    if (this.isSubscribed) {
      this.aggregator.unsubscribe(this._key, this._onBusMessage);
      this._subscriptionInfo = null;
    }
  }

  on(event: string, handler: BusEventHandler): UnsubscribeFn {
    return this._emitter.on(event, handler);
  }

  /**
   * Unsubscribe an event handler from an event
   * @param {String} event names
   * @param {BusEventHandler} handler the event handler
   */
  off(event: string, handler: BusEventHandler): void {
    this._emitter.off(event, handler);
  }

  getListenerCount(eventNames: string | string[]): number {
    return this._emitter.listenerCount(eventNames);
  }

  async emit(event: string, data = {}): Promise<void> {
    const eventData = this._formatData(data);
    await baseEmit(this.client, this._key, event, eventData);
    return this._localEmit(event, data);
  }

  pipelineEmit(
    pipeline: Pipeline,
    event: string,
    data: Record<string, any>,
  ): Pipeline {
    // todo: if we pipeline, do we also local emit ?
    // const eventData = this._formatData(data);
    const temp = baseEmit(pipeline, this._key, event, data);
    return pipeline;
  }

  /**
   * Returns the number of events remaining in the stream
   */
  getLength(): Promise<number> {
    return this.client.xlen(this._key);
  }

  /**
   * Utility method to get the last item in the stream
   */
  async getLastEvent(): Promise<{
    event: string;
    data: Record<string, any>;
  }> {
    const res = await this.client.xrevrange(this._key, '+', '-', 'COUNT', 1);
    const event = res?.[0];
    if (event) {
      const eventData = parseObjectResponse(event?.[1]);
      const [name, data] = parseEventData(eventData);
      if (name) {
        return {
          event: name,
          data,
        };
      }
    }
    return null;
  }

  cleanup(maxLen = 1000): Promise<number> {
    return this.client.xtrim(this._key, 'MAXLEN', '~', maxLen);
  }

  createAsyncIterator<T = any, TOutput = T>(
    options: IteratorOptions<any, T, TOutput>,
  ): AsyncIterator<TOutput> {
    return createAsyncIterator<any, T, TOutput>(this._emitter, options);
  }

  private _formatData(data = {}): Record<string, any> {
    const serialized = JSON.stringify(data);
    return { [SENDER_ID_KEY]: this._senderId, data: serialized };
  }

  private _localEmit(event: string, data: Record<string, any>): Promise<void> {
    return this._emitter.emit(event, data);
  }

  /**
   * @private
   * @param data
   * @return {Promise<void>}
   */
  private _onBusMessage(data: [string, any]): Promise<void> {
    const subscription = this.subscriptionInfo;
    if (!subscription) return;
    this._lastEventId = subscription.cursor;
    if (data) {
      const [id, other] = data;
      this._lastEventId = id;
      // if __sid is set, it means it was already emitted locally
      // make sure we weren't the ones doing it
      if (other && other.__sid !== this._senderId) {
        const [event, data] = parseEventData(other);
        if (event) {
          return this._localEmit(event, data);
        }
      }
    }
  }
}

function parseEventData(data: any): [string, Record<string, any>] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { __sid, __evt, ...rest } = data;
  const event = __evt ?? (rest ?? {})[EVENT_KEY];
  if (event) {
    if (rest.data) {
      const { data: eventData, ...other } = rest;
      const data = safeParse(eventData);
      if (isEmpty(other)) {
        return [event, data];
      }
      rest.data = data;
    }
  }
  return [event, rest];
}
