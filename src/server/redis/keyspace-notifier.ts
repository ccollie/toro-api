'use strict';
import Emittery from 'emittery';
import { RedisConnection } from 'bullmq';
import IORedis from 'ioredis';
import { ConnectionOptions } from '@src/types';
import { createClient } from './utils';

// (1) -> keyspace || keyevent
// (2) -> An integer 0-9 (redis db idx)
// (3) -> if keyspace then a db key; if keyevent then a redis action (set, del, etc)
// #actedOn = if keyspace then a redis action; if keyevent then a db key
const ChannelRegex = /__(keyspace|keyevent)@([0-9]+)__:([^\s]+)/i;

const isValidType = (type): boolean => ['keyevent', 'keyspace'].includes(type);

// __<keyspace||keyevent>@<db idx>__:<some key>
function getChannel(type: string, db = 0, key = '*'): string {
  return `__${type}@${db}__:${key}`;
}

export interface KeyspaceNotification {
  type: string;
  key: string;
  event: string;
  pattern: string;
  channel: string;
  db: number;
}

export interface KeyspaceNotificationFunc {
  (msg: KeyspaceNotification): void;
}

// http://redis.io/topics/notifications
export class KeyspaceNotifier {
  private readonly emitter = new Emittery();
  private client: IORedis.Redis;
  private db = 0;
  private initializing: Promise<IORedis.Redis>;
  private readonly connectionOpts: ConnectionOptions;

  constructor(opts: ConnectionOptions) {
    this.connectionOpts = opts;
    this.initializing = this.init();
  }

  async destroy(): Promise<void> {
    await this.client.disconnect();
    this.emitter.clearListeners();
  }

  private async init(): Promise<IORedis.Redis> {
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

    // TODO: investigate possible different versions of @types/ioredis
    // @ts-ignore
    await RedisConnection.waitUntilReady(client);
    return client;
  }

  /**
   * Subscribe to a keyspace notification
   * @param {String} type One of `keyspace` or `keyevent`
   * @param {String} key Subscribe to a specific key, or all #type events (*)
   * @param {KeyspaceNotificationFunc} cb function to call on a keyspace notification
   * @returns {Promise<Function>} an unsubscribe function
   */
  async subscribe(type: string, key: string, cb: KeyspaceNotificationFunc) {
    if (!isValidType(type)) {
      throw new Error(
        `Invalid subscription key type sent to #subscribe: ${type}`,
      );
    }

    const channel = getChannel(type, this.db, key);
    const handlerCount = this.emitter.listenerCount(channel);
    if (!handlerCount) {
      // When the Redis subscriber is ready select the relevant db index
      // and start subscribing to keyspace notifications.
      //  if (firstPass) {
      //      firstPass = false
      //      await subscriber.select(db);
      //  }
      await this.client.psubscribe(channel);
    }

    // this dedupes handlers
    this.emitter.on(channel, cb);

    return (): Promise<void> => {
      return this.unsubscribe(type, key, cb);
    };
  }

  /***
   * Unsubscribe from a keyspace notification
   * @param type {String} One of `keyspace` or `keyevent`
   * @param key  {String} The specific key, or all #type events (*)
   * @param cb   {KeyspaceNotificationFunc} previously subscribed notification handler
   * @returns {Promise<void>}
   */
  async unsubscribe(
    type: string,
    key: string,
    cb: KeyspaceNotificationFunc,
  ): Promise<void> {
    if (!isValidType(type)) {
      throw new Error(
        `Invalid subscription key type sent to #unsubscribe: ${type}`,
      );
    }

    const channel = getChannel(type, this.db, key);
    this.emitter.off(channel, cb);

    const handlerCount = this.emitter.listenerCount(channel);
    if (!handlerCount) {
      await this.client.punsubscribe(channel);
    }
  }

  getSubscriptionCount(): number {
    return this.emitter.listenerCount();
  }
}
