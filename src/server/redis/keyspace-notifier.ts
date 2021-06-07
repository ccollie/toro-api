'use strict';
import Emittery, { UnsubscribeFn } from 'emittery';
import { ConnectionOptions } from '../../types';
import { createClient, waitUntilReady } from './utils';
import { createDebug } from '../lib/debug';
import { RedisClient } from 'bullmq';

const debug = createDebug('keyspace notifications');

// (1) -> keyspace || keyevent
// (2) -> An integer 0-9 (redis db idx)
// (3) -> if keyspace then a db key; if keyevent then a redis action (set, del, etc)
// #actedOn = if keyspace then a redis action; if keyevent then a db key
const ChannelRegex = /__(keyspace|keyevent)@([0-9]+)__:([^\s]+)/i;

const isValidType = (type): boolean => ['keyevent', 'keyspace'].includes(type);

export enum KeyspaceNotificationType {
  KEYSPACE = 'keyspace',
  KEYEVENT = 'keyevent',
}

// __<keyspace||keyevent>@<db idx>__:<some key>
export function getChannel(type: string, key = '*', db = 0): string {
  return `__${type}@${db}__:${key}`;
}

export interface KeyspaceNotification {
  type: KeyspaceNotificationType;
  key: string;
  event: string;
  pattern: string;
  channel: string;
  db: number;
}

export type KeyspaceNotificationFunc = (msg: KeyspaceNotification) => void;

// http://redis.io/topics/notifications
export class KeyspaceNotifier {
  private readonly emitter = new Emittery();
  private client: RedisClient;
  private db = 0;
  private readonly initializing: Promise<RedisClient>;
  private readonly connectionOpts: ConnectionOptions;

  constructor(opts: ConnectionOptions) {
    this.connectionOpts = opts;
    this.initializing = this.init();
  }

  async destroy(): Promise<void> {
    this.emitter.clearListeners();
    await this.client.disconnect();
  }

  private async init(): Promise<RedisClient> {
    const client = createClient(this.connectionOpts);

    this.client = client;
    this.db = (this.client as any).options.db;

    client.on('error', (err) => {
      throw new Error(err);
      // emit
    });

    await client.config('SET', 'notify-keyspace-events', 'AKE');

    client.on('pmessage', (pattern, channel, actedOn) => {
      const parse = channel.match(ChannelRegex);

      const type = parse[1];

      let key, event;
      if (type === 'keyspace') {
        key = parse[3];
        event = actedOn;
      } else {
        key = actedOn;
        event = parse[3];
      }

      const msg: KeyspaceNotification = {
        type,
        key,
        event,
        pattern,
        channel,
        db: parseInt(parse[2]),
      };

      this.emitter.emit(channel, msg).catch((err) => {
        console.log(err);
      });
    });

    await waitUntilReady(client);
    return client;
  }

  async subscribeKey(
    key: string | string[],
    cb: KeyspaceNotificationFunc,
  ): Promise<() => void> {
    return this.subscribe(KeyspaceNotificationType.KEYSPACE, key, cb);
  }

  async subscribeEvent(
    event: string | string[],
    cb: KeyspaceNotificationFunc,
  ): Promise<UnsubscribeFn> {
    return this.subscribe(KeyspaceNotificationType.KEYEVENT, event, cb);
  }

  /**
   * Subscribe to a keyspace notification
   * @param {String} type One of `keyspace` or `keyevent`
   * @param {String} key Subscribe to a specific key, or all #type events (*)
   * @param {KeyspaceNotificationFunc} cb function to call on a keyspace notification
   * @returns {Promise<Function>} an unsubscribe function
   */
  private async subscribe(
    type: KeyspaceNotificationType,
    key: string | string[],
    cb: KeyspaceNotificationFunc,
  ): Promise<UnsubscribeFn> {
    if (!isValidType(type)) {
      throw new Error(
        `Invalid subscription key type sent to #subscribe: ${type}`,
      );
    }

    await this.initializing;

    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const channel = getChannel(type, key, this.db);
      const handlerCount = this.emitter.listenerCount(channel);

      // this de-dupes handlers
      this.emitter.on(channel, cb);
      if (!handlerCount) {
        await this.client.psubscribe(channel);
      }
    }

    return (): void => {
      this.unsubscribe(type, keys, cb).catch((err) => {
        debug('error unsubscribing %O', err);
      });
    };
  }

  /***
   * Unsubscribe from a keyspace notification
   * @param type {String} One of `keyspace` or `keyevent`
   * @param key  {String | String[]} The specific key, or all #type events (*)
   * @param cb   {KeyspaceNotificationFunc} previously subscribed notification handler
   * @returns {Promise<void>}
   */
  async unsubscribe(
    type: KeyspaceNotificationType,
    key: string | string[],
    cb: KeyspaceNotificationFunc,
  ): Promise<void> {
    if (!isValidType(type)) {
      throw new Error(
        `Invalid subscription key type sent to #unsubscribe: ${type}`,
      );
    }

    const keys = Array.isArray(key) ? key : [key];
    for (let i = 0; i < keys.length; i++) {
      const channel = getChannel(type, keys[i], this.db);
      this.emitter.off(channel, cb);

      const handlerCount = this.emitter.listenerCount(channel);
      if (!handlerCount) {
        await this.client.punsubscribe(channel);
      }
    }
  }

  getSubscriptionCount(): number {
    return this.emitter.listenerCount();
  }

  // primarily for testing
  onAny(cb: KeyspaceNotificationFunc): Emittery.UnsubscribeFn {
    return this.emitter.onAny((eventName, eventData) => {
      cb(eventData as KeyspaceNotification);
    });
  }
}
