import { Queue, RedisClient } from 'bullmq';
import Emittery from 'emittery';
import pSettle from 'p-settle';
import pAll from 'p-all';
import { sortBy, uniqBy } from 'lodash';
import {
  QueueManager,
  discoverQueues,
  convertWorker,
  getPipelinedCounts,
} from '../queues';
import {
  checkMultiErrors,
  createClient,
  getRedisInfo,
  EventBus,
  LockManager,
  RedisStreamAggregator,
  WriteCache,
} from '../redis';
import {
  DiscoveredQueue,
  HostConfig,
  NotificationContext,
  RedisMetrics,
  QueueConfig,
  ConnectionOptions,
  QueueWorker,
  JobCounts,
  JobStatusEnum,
} from '../../types';

import config, { getValue } from '../config';
import logger from '../lib/logger';
import {
  fixupQueueConfig,
  generateQueueId,
  getHostConfig,
  removeQueueConfig,
} from './host-config';
import { getHostBusKey, getHostKey, getLockKey } from '../lib/keys';
import { Channel, NotificationManager } from '../notifications';
import { getHostUri } from '../lib';

const JOB_STATES = Object.values(JobStatusEnum);

const queueConfigKey = (prefix: string, name: string): string => {
  return `${prefix}:${name}`;
};

/** Manages all resource (queues specifically) grouped under a named host */
export class HostManager {
  public readonly name: string;
  public readonly description: string;
  public readonly config: HostConfig;
  public readonly queueManagers: QueueManager[] = [];
  public readonly notifications: NotificationManager;
  public readonly streamAggregator: RedisStreamAggregator;
  public readonly bus: EventBus;
  public readonly lock: LockManager;
  public readonly writer: WriteCache;

  private readonly connectionOpts: ConnectionOptions;
  private readonly defaultRedisClient: RedisClient;
  private readonly queueManagerMap: Map<string, QueueManager>;
  private readonly _initialized: Promise<void>;
  private _notificationContext: NotificationContext;

  private _uri: string = undefined;

  constructor(opts: HostConfig) {
    this.name = opts.name;
    this.config = opts;
    this.description = opts.description;
    this.queueManagerMap = new Map<string, QueueManager>();
    this.connectionOpts = opts.connection;
    const client = this.createClient(this.connectionOpts);
    this.defaultRedisClient = client;

    this.streamAggregator = new RedisStreamAggregator({
      connectionOptions: this.connectionOpts,
    });

    this.bus = new EventBus(this.streamAggregator, getHostBusKey(this.name));
    this.notifications = new NotificationManager(this);

    const lockKey = getLockKey(opts.name);
    this.lock = new LockManager(client, { key: lockKey });

    this.writer = new WriteCache(client, this.lock);

    new Emittery().bindMethods(this as Record<string, any>);

    this._initialized = this.init();
  }

  async destroy(): Promise<void> {
    this.writer.destroy();
    this.bus.destroy();
    const dtors = this.queueManagers.map((manager) => () => manager.destroy());
    dtors.push(() => this.lock.destroy());
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

  get client(): RedisClient {
    return this.defaultRedisClient;
  }

  get hostQueuesKey(): string {
    return getHostKey(this.name, 'queues');
  }

  get uri(): string {
    if (typeof this._uri === 'string') {
      return this._uri;
    }
    // we've already tried.
    if (this._uri === null) return null;
    try {
      const data = {
        id: this.id,
        name: this.name,
      };
      this._uri = getHostUri(data);
    } catch (err) {
      this._uri = null;
      logger.warn(err);
    }
  }

  async discoverQueues(
    prefix?: string,
    unregisteredOnly = true,
  ): Promise<DiscoveredQueue[]> {
    const discovered = await discoverQueues(this.defaultRedisClient, prefix);
    if (unregisteredOnly && discovered.length) {
      const current = new Set(
        this.queueManagers.map((queue) => `${queue.prefix}:${queue.name}`),
      );
      return discovered.filter(({ name, prefix }) => {
        return !current.has(`${prefix}:${name}`);
      });
    }
    return discovered;
  }

  getRedisInfo(): Promise<RedisMetrics> {
    return getRedisInfo(this.defaultRedisClient);
  }

  private createClient(redisOpts?: ConnectionOptions): RedisClient {
    if (this.defaultRedisClient && !redisOpts) {
      return this.defaultRedisClient.duplicate();
    }
    return createClient(redisOpts);
  }

  private ensureQueueId(config: QueueConfig): void {
    config.id =
      config.id || generateQueueId(this.config, config.prefix, config.name);
  }

  public async addQueue(config: QueueConfig): Promise<QueueManager> {
    logger.info(`host ${this.name}: added queue`, config.name);

    this.ensureQueueId(config);

    const opts = {
      prefix: config.prefix,
      connection: this.defaultRedisClient,
    };

    const key = queueConfigKey(config.prefix, config.name);
    let manager = this.queueManagerMap.get(key);
    if (!manager) {
      const queue = new Queue(config.name, opts);
      manager = new QueueManager(this, queue, config);
      this.queueManagers.push(manager);
      this.queueManagerMap.set(key, manager);

      // store config in redis
      const stringified = JSON.stringify(config);
      await this.defaultRedisClient.hset(this.hostQueuesKey, key, stringified);
      // this is somewhat hacky: update the global host/queue configs
      const hostConfig = getHostConfig(this.id);
      if (hostConfig) {
        const queues = (hostConfig.queues ||= []);
        const found = queues.find((x) => x.id === config.id);
        if (!found) {
          queues.push(config);
        }
      }
    }

    return manager;
  }

  private async addToQueueSet(queues: QueueConfig[]): Promise<void> {
    queues.forEach((queue) => {
      if (!queue.id) {
        fixupQueueConfig(this.config, queue);
      }
    });
    queues = uniqBy(queues, (x) => x.id);
    for (const config of queues) {
      await this.addQueue(config);
    }
  }

  private async loadQueues(): Promise<QueueConfig[]> {
    const key = this.hostQueuesKey;
    const raw = await this.defaultRedisClient.hgetall(key);
    const keys = Object.keys(raw);
    const queues: QueueConfig[] = [];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const data = raw[key];
      try {
        const cfg = JSON.parse(data) as QueueConfig;
        if (cfg) queues.push(cfg);
        // todo: make sure fields we expect exist
      } catch {}
    }
    return queues;
  }

  private async init(): Promise<void> {
    // createChannel queues
    const config = this.config;
    const queueConfigs: QueueConfig[] = [];
    const wasInit = await this.client.exists(this.hostQueuesKey);
    if (wasInit) {
      const queues = await this.loadQueues();
      queueConfigs.push(...queues);
    } else {
      queueConfigs.push(...config.queues);
      if (config.autoDiscoverQueues) {
        const queues = await this.discoverQueues();
        queues.forEach(({ name, prefix }) => {
          const cfg: QueueConfig = {
            name,
            prefix,
            jobTypes: [],
          };
          this.ensureQueueId(cfg);
          queueConfigs.push(cfg);
        });
      }
    }

    const calls = [
      () => this.addToQueueSet(queueConfigs),
      () => this.bus.waitUntilReady(),
    ];
    if (process.env.NODE_ENV !== 'example') {
      this.writer.poll();
      calls.push(async () => {
        await this.lock.start();
      });
    }
    // make this pSettle ?
    await pAll(calls);
  }

  getQueueById(id: string): Queue | undefined {
    const manager = this.queueManagers.find((x) => x.id === id);
    return manager && manager.queue;
  }

  getQueue(prefix: string, name: string): Queue {
    const key = queueConfigKey(prefix, name);
    const manager = this.queueManagerMap.get(key);
    return manager?.queue;
  }

  getQueueManager(queue: string | Queue): QueueManager {
    if (typeof queue === 'string') {
      return this.queueManagers.find((x) => x.queue.name === queue);
    }
    return this.queueManagers.find((x) => x.queue === queue);
  }

  async removeQueue(queue: Queue): Promise<QueueManager | null> {
    if (!queue) return null;
    const idx = this.queueManagers.findIndex((x) => x.queue === queue);

    if (idx >= 0) {
      const result = this.queueManagers[idx];
      const key = queueConfigKey(result.prefix, result.name);
      this.queueManagers.splice(idx, 1);
      this.queueManagerMap.delete(key);
      await this.defaultRedisClient.hdel(this.hostQueuesKey, key);

      // this is somewhat hacky: update the global host/queue configs
      removeQueueConfig(this.id, queue.name, queue.opts.prefix);

      return result;
    }
    return null;
  }

  getQueues(): Queue[] {
    const queues = this.queueManagers.map((mgr) => mgr.queue);
    return sortBy(queues, ['prefix', 'name']);
  }

  getChannels(): Promise<Channel[]> {
    return this.notifications.getChannels();
  }

  async getWorkers(): Promise<QueueWorker[]> {
    const queues = this.getQueues();
    const clientNames = queues.map((queue) => {
      // hack
      return (queue as any).clientName();
    });

    function parseClientList(list: string): QueueWorker[] {
      const lines = list.split('\n');
      const workers: QueueWorker[] = [];

      lines.forEach((line: string) => {
        const client: { [index: string]: string } = {};
        const keyValues = line.split(' ');
        keyValues.forEach(function (keyValue) {
          const index = keyValue.indexOf('=');
          const key = keyValue.substring(0, index);
          client[key] = keyValue.substring(index + 1);
        });
        const name = client['name'];
        if (!name) return;
        // only consider queues we're managing
        for (let i = 0; i < queues.length; i++) {
          if (name.startsWith(clientNames[i])) {
            client['name'] = queues[i].name;
            workers.push(convertWorker(client));
          }
        }
      });

      return workers;
    }

    const clients = await this.client.client('list');
    return parseClientList(clients);
  }

  async getJobCounts(states?: JobStatusEnum[]): Promise<JobCounts> {
    states = (!states || states.length) === 0 ? JOB_STATES : states;
    const counts: JobCounts = Object.create(null);
    states.forEach((state) => {
      counts[state] = 0;
    });
    const pipeline = this.client.pipeline();
    const queues = this.getQueues();
    queues.forEach((queue) => {
      getPipelinedCounts(pipeline, queue, states);
    });
    const responses = await pipeline.exec().then(checkMultiErrors);
    let stateIndex = 0;
    for (let i = 0; i < responses.length; i++) {
      const state = states[stateIndex++];
      counts[state] = counts[state] + (responses[i] || 0);
      stateIndex = stateIndex % states.length;
    }
    return counts;
  }

  async waitUntilReady(): Promise<void> {
    return this._initialized;
  }

  listen(): void {
    this.queueManagers.forEach((handler) => handler.listen());
  }

  sweep(): void {
    this.bus.cleanup().catch((err) => {
      logger.warn(err);
    });
    this.queueManagers.forEach((handler) => handler.sweep());
  }

  get notificationContext(): NotificationContext {
    if (!this._notificationContext) {
      const env = config.get('env');
      const app = getValue('appInfo');
      const { id, name, uri } = this;
      this._notificationContext = {
        host: {
          id,
          name,
          uri,
        },
        app,
        env,
      };
    }
    return this._notificationContext;
  }
}
