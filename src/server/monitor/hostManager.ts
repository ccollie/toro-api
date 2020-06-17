import { Queue } from 'bullmq';
import Emittery from 'emittery';
import IORedis from 'ioredis';
import pSettle from 'p-settle';
import { sortBy } from 'lodash';
import { QueueManager } from '../queues';
import {
  KeyspaceNotifier,
  LockManager,
  RedisStreamAggregator,
  WriteCache,
} from '../redis';
import { DiscoveredQueue, RedisMetrics } from '@src/types';
import { ConnectionOptions, HostConfig, QueueConfig } from 'config';
import { createClient, discoverQueues, getRedisInfo } from '../redis/utils';

import config from '../config';
import logger from '../lib/logger';
import { generateQueueId } from '../config/host-config';
import { NotificationManager } from '../notifications';

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

const queueConfigKey = (prefix: string, name: string): string => {
  return `${prefix}:${name}`;
};

/** Manages all resource (queues specifically) grouped under a named host */
export class HostManager {
  public readonly name: string;
  public readonly description: string;
  private readonly connectionOpts: ConnectionOptions;
  private readonly defaultRedisClient: IORedis.Redis;
  private readonly queueManagerMap: Map<string, QueueManager>;
  private readonly notifications: any;
  private readonly streamAggregator: RedisStreamAggregator;
  public queueManagers: QueueManager[] = [];
  public readonly keyspaceNotifier: KeyspaceNotifier;
  private readonly config: HostConfig;
  private readonly _context: HostContext;
  private readonly _initialized: Promise<void>;

  constructor(opts: HostConfig, notifications: NotificationManager) {
    this.name = opts.name;
    this.config = opts;
    this.description = opts.description;
    this.queueManagerMap = new Map<string, QueueManager>();
    this.notifications = notifications;
    this.connectionOpts = opts.connection;
    const client = this.createClient(this.connectionOpts);
    this.defaultRedisClient = client;

    this.streamAggregator = new RedisStreamAggregator({
      connectionOpts: this.connectionOpts,
    });

    this.keyspaceNotifier = new KeyspaceNotifier(this.connectionOpts);

    this[WRITE_LOCK] = new LockManager(
      client,
      this.keyspaceNotifier,
      opts.name,
    );

    this[WRITER] = new WriteCache(
      client,
      this[WRITE_LOCK],
      config.getValue('flushInterval'),
    );

    new Emittery().bindMethods(this);

    this._context = {
      host: this.name,
      writer: this[WRITER] as WriteCache,
      client: this.client,
      lock: this[WRITE_LOCK] as LockManager,
      streamAggregator: this.streamAggregator,
      notifications: this.notifications,
      keyspaceNotifier: this.keyspaceNotifier,
    };

    this._initialized = this.init();
  }

  async destroy(): Promise<void> {
    const writer = this[WRITER] as WriteCache;
    const lock = this[WRITE_LOCK] as LockManager;
    writer.destroy();
    const dtors = this.queueManagers.map((manager) => () => manager.destroy());
    dtors.push(() => lock.destroy());
    dtors.push(() => this.keyspaceNotifier.destroy());
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

  get client(): IORedis.Redis {
    return this.defaultRedisClient;
  }

  discoverQueues(prefix?: string): Promise<DiscoveredQueue[]> {
    return discoverQueues(this.defaultRedisClient, prefix);
  }

  getRedisInfo(): Promise<RedisMetrics> {
    return getRedisInfo(this.defaultRedisClient);
  }

  private createClient(redisOpts?: ConnectionOptions): IORedis.Redis {
    if (this.defaultRedisClient && !redisOpts) {
      return this.defaultRedisClient.duplicate();
    }
    return createClient(redisOpts);
  }

  public addQueue(config: QueueConfig): QueueManager {
    logger.info(`host ${this.name}: added queue`, config.name);

    config.id =
      config.id || generateQueueId(this.config, config.prefix, config.name);

    const opts = {
      prefix: config.prefix,
      connection: this.defaultRedisClient,
    };

    const key = queueConfigKey(config.prefix, config.name);
    let manager = this.queueManagerMap.get(key);
    if (!manager) {
      const queue = new Queue(config.name, opts);
      manager = new QueueManager(this._context, queue, config);
      this.queueManagers.push(manager);
      this.queueManagerMap.set(key, manager);
    }

    return manager;
  }

  private addToQueueSet(queues: QueueConfig[]): void {
    for (const config of queues) {
      this.addQueue(config);
    }
  }

  private async init(): Promise<void> {
    // init queues
    const config = this.config;
    const queueConfigs = [...config.queues];
    if (config.autoDiscoverQueues) {
      const queues = await this.discoverQueues();
      queues.forEach(({ name, prefix }) => {
        const cfg: QueueConfig = {
          name,
          prefix,
          jobTypes: [],
        };
        queueConfigs.push(cfg);
      });
    }
    this.addToQueueSet(queueConfigs);
    const lock = this[WRITE_LOCK];
    await lock.start();
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

  removeQueue(queue: Queue): QueueManager | null {
    if (!queue) return null;
    const idx = this.queueManagers.findIndex((x) => x.queue === queue);

    if (idx >= 0) {
      const result = this.queueManagers[idx];
      this.queueManagers.splice(idx, 1);
      const key = queueConfigKey(result.prefix, result.name);
      this.queueManagerMap.delete(key);
      return result;
    }
    return null;
  }

  getQueues(): Queue[] {
    const queues = this.queueManagers.map((mgr) => mgr.queue);
    return sortBy(queues, ['prefix', 'name']);
  }

  async waitUntilReady(): Promise<void> {
    return this._initialized;
  }

  listen(): void {
    this.queueManagers.forEach((handler) => handler.listen());
  }
}
