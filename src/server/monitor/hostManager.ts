import { Queue } from 'bullmq';
import Emittery from 'emittery';
import IORedis from 'ioredis';
import pSettle from 'p-settle';
import { isString } from 'lodash';
import { QueueManager } from './queues';
import { WriteCache, RedisStreamAggregator } from '../redis';
import { LockManager } from './lib/lockManager';
import { ConnectionOptions, HostConfig, QueueConfig } from 'config';
import { createClient, discoverQueues, getRedisInfo } from '../redis/utils';
import { RedisMetrics } from '@src/types';
import {
  KeyspaceNotification,
  KeyspaceNotifier,
} from '../redis/keyspace-notifier';

import config from '../config';
import logger from '../lib/logger';
import { generateQueueId } from '../config/host-config';

const WRITER = Symbol('writer');
const WRITE_LOCK = Symbol('write lock');

export interface HostContext {
  streamAggregator: RedisStreamAggregator;
  host: string;
  writer: WriteCache;
  client: IORedis.Redis;
  lock: LockManager;
  notifications: any;
  keyspaceNotifier: KeyspaceNotifier;
}

function createContext(self): HostContext {
  return {
    host: self.host,
    writer: self[WRITER] as WriteCache,
    client: self.client,
    lock: self[WRITE_LOCK] as LockManager,
    streamAggregator: self.streamAggregator,
    notifications: self.notifications,
    keyspaceNotifier: self.keyspaceNotifier,
  };
}

/** Manages all resource (queues specifically) grouped under a named host */
export class HostManager {
  public readonly name: string;
  public readonly description: string;
  private readonly connectionOpts: ConnectionOptions;
  private readonly defaultRedisClient: IORedis.Redis;
  private readonly queueManagerMap: Map<string, QueueManager>;
  private readonly _initialized: Promise<void>;
  private readonly notifications: any;
  private readonly streamAggregator: RedisStreamAggregator;
  public queueManagers: QueueManager[] = [];
  public readonly keyspaceNotifier: KeyspaceNotifier;
  private readonly bullOpts: any = {};
  private readonly config: HostConfig;

  constructor(opts: HostConfig, notifications) {
    this.name = opts.name;
    this.config = opts;
    this.description = opts.description;
    this.queueManagerMap = new Map<string, QueueManager>();
    this.notifications = notifications;
    this.bullOpts = {
      prefix: opts.prefix || 'bull',
    };
    this.connectionOpts = opts.connection;
    this.createClient = this.createClient.bind(this);
    const client = this.createClient();
    this.defaultRedisClient = client;

    this.streamAggregator = new RedisStreamAggregator({
      connectionOpts: this.connectionOpts,
    });

    this[WRITE_LOCK] = new LockManager(client, opts.name);
    this[WRITER] = new WriteCache(
      client,
      this[WRITE_LOCK],
      config.getValue('flushInterval'),
    );

    this.keyspaceNotifier = new KeyspaceNotifier(this.connectionOpts);

    new Emittery().bindMethods(this);

    this._initialized = this.init(opts);
  }

  async destroy(): Promise<void> {
    const writer = this[WRITER] as WriteCache;
    const lock = this[WRITE_LOCK] as LockManager;
    writer.destroy();
    const dtors = this.queueManagers.map((manager) => () => manager.destroy());
    dtors.push(() => this.keyspaceNotifier.destroy());
    dtors.push(() => lock.destroy());
    dtors.push(() => this.streamAggregator.destroy());
    const settlement = await pSettle(dtors, { concurrency: 4 });
    // TODO:
    settlement
      .filter((x) => x.isRejected)
      .forEach((x) => {
        console.log((x as pSettle.PromiseRejectedResult).reason);
      });
  }

  get id(): string {
    return this.config.id;
  }

  discoverQueues(): Promise<string[]> {
    return discoverQueues(this.defaultRedisClient, this.bullOpts.prefix);
  }

  getRedisInfo(): Promise<RedisMetrics> {
    return getRedisInfo(this.defaultRedisClient);
  }

  private createClient(
    type: 'client' | 'subscriber' | 'bclient' = 'client',
    redisOpts?: ConnectionOptions,
  ): IORedis.Redis {
    if (type === 'client' && this.defaultRedisClient) {
      return this.defaultRedisClient;
    }
    return createClient(redisOpts);
  }

  private addQueue(context: HostContext, config: QueueConfig): QueueManager {
    logger.info(`host ${this.name}: added queue`, config.name);
    const prefix = config.prefix || this.bullOpts.prefix || 'bull';
    const opts = { ...this.bullOpts, prefix, createClient: this.createClient };
    const queue = new Queue(config.name, opts);
    const manager = new QueueManager(context, queue, config);
    this.queueManagers.push(manager);
    this.queueManagerMap.set(config.name, manager);
    return manager;
  }

  private addToQueueSet(queues: QueueConfig[]): void {
    const context = createContext(this);
    for (const config of queues) {
      if (this.queueManagerMap.has(config.name)) {
        continue;
      }
      this.addQueue(context, config);
    }
  }

  private async init(config: HostConfig): Promise<void> {
    // init queues
    const queueConfigs = [...config.queues];
    if (config.autoDiscoverQueues) {
      const queues = await this.discoverQueues();
      queues.forEach((name) => {
        const cfg: QueueConfig = {
          name,
          prefix: this.bullOpts.prefix,
          jobTypes: [],
        };
        cfg.id = generateQueueId(config, cfg.prefix, cfg.name);
        queueConfigs.push(cfg);
      });
    }
    this.addToQueueSet(queueConfigs);
    const lock = this[WRITE_LOCK];
    await lock.start();
    await this.keyspaceNotifier.subscribe(
      'keyspace',
      lock.lockKey,
      (msg: KeyspaceNotification) => {
        switch (msg.event) {
          case 'expire':
          case 'del':
            return lock.checkLockStatus();
        }
      },
    );
  }

  getQueueById(id: string): Queue | undefined {
    const manager = this.queueManagers.find((x) => x.id === id);
    return manager && manager.queue;
  }

  getQueue(name: string): Queue {
    const manager = this.getQueueManager(name);
    return manager && manager.queue;
  }

  getQueueManager(name: string): QueueManager {
    return this.queueManagers.find((x) => x.queue.name === name);
  }

  removeQueue(queue: string | Queue): QueueManager | null {
    let idx;

    if (!queue) return null;
    if (isString(queue)) {
      idx = this.queueManagers.findIndex((x) => x.queue.name === name);
    } else {
      idx = this.queueManagers.findIndex((x) => x.queue === queue);
    }

    if (idx >= 0) {
      const result = this.queueManagers[idx];
      this.queueManagers.splice(idx, 1);
      return result;
    }
    return null;
  }

  getQueues(): Queue[] {
    return this.queueManagers.map((mgr) => mgr.queue);
  }

  async waitUntilReady(): Promise<void> {
    return this._initialized;
  }

  listen(): void {
    this.queueManagers.forEach((handler) => handler.listen());
  }
}
