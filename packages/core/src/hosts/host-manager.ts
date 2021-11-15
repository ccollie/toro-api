import boom from '@hapi/boom';
import {
  ConnectionOptions,
  FlowJob,
  FlowProducer,
  JobNode,
  NodeOpts,
  Queue,
  RedisClient,
} from 'bullmq';
import Emittery from 'emittery';
import pSettle from 'p-settle';
import pAll from 'p-all';
import pMap from 'p-map';
import { sortBy, uniqBy } from 'lodash';
import { ensureScriptsLoaded } from '../commands';
import { JobCounts, JobStatusEnum } from '../types';
import { QueueManager } from '../queues/queue-manager';
import {
  DiscoveredQueue,
  discoverQueues,
  getPipelinedCounts,
} from '../queues/queue';
import { JobValidationResult, validateJobData } from '../queues/job-schemas';
import {
  checkMultiErrors,
  createClient,
  EventBus,
  getRedisInfo,
  LockManager,
  RedisMetrics,
  RedisStreamAggregator,
  WriteCache,
} from '../redis';

import { env as environment, appInfo } from '../config';
import { logger } from '../logger';
import {
  fixupQueueConfig, generateHostId,
  generateQueueId,
  getHostConfig,
  HostConfig,
  QueueConfig,
  removeQueueConfig,
} from './host-config';
import { getHostBusKey, getHostKey, getLockKey } from '../keys';
import {
  Channel,
  NotificationManager,
} from '../notifications';
import { NotificationContext } from '../types';
import { getHostUri } from '../lib';
import { convertWorker, QueueWorker } from '../queues';

const queueConfigKey = (prefix: string, name: string): string => {
  return `${prefix}:${name}`;
};

/** Manages all resource (queues specifically) grouped under a named host */
export class HostManager {
  private readonly _id: string;
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
  private flowProducer: FlowProducer;

  private readonly _initialized: Promise<void>;

  constructor(opts: HostConfig) {
    this._id = opts.id = generateHostId(opts);
    this.name = opts.name;
    this.config = opts;
    this.description = opts.description;
    this.queueManagerMap = new Map<string, QueueManager>();
    this.connectionOpts = opts.connection;
    const client = this.createClient(this.connectionOpts);
    this.defaultRedisClient = client;

    this.streamAggregator = new RedisStreamAggregator({
      connection: this.createClient(),
    });

    this.bus = new EventBus(this.streamAggregator, getHostBusKey(this.name));
    this.notifications = new NotificationManager(this);

    const lockKey = getLockKey(opts.name);
    this.lock = new LockManager(client, { key: lockKey });

    this.writer = new WriteCache(client, this.lock);

    new Emittery().bindMethods(this as Record<string, any>);

    this._initialized = this.init();
  }

  private _notificationContext: NotificationContext;

  get notificationContext(): NotificationContext {
    if (!this._notificationContext) {
      const { id, name, uri } = this;
      this._notificationContext = {
        host: {
          id,
          name,
          uri,
        },
        app: appInfo,
        env: environment,
      };
    }
    return this._notificationContext;
  }

  private _uri: string = undefined;

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

  get id(): string {
    return this._id;
  }

  get client(): RedisClient {
    return this.defaultRedisClient;
  }

  get hostQueuesKey(): string {
    return getHostKey(this.name, 'queues');
  }

  async destroy(): Promise<void> {
    this.writer.destroy();
    this.bus.destroy();
    const dtors = this.queueManagers.map((manager) => () => manager.destroy());
    dtors.push(() => this.lock.destroy());
    dtors.push(() => this.streamAggregator.destroy());
    if (this.flowProducer) {
      dtors.push(() => this.flowProducer.disconnect());
    }
    const settlement = await pSettle(dtors, { concurrency: 4 });
    // TODO:
    settlement
      .filter((x) => x.isRejected)
      .forEach((x) => {
        console.log((x as pSettle.PromiseRejectedResult).reason);
      });
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

  public async addQueue(config: QueueConfig): Promise<QueueManager> {
    logger.info(`host ${this.name}: added queue "%s"`, config.name);

    this.ensureQueueId(config);

    const opts = {
      prefix: config.prefix,
      connection: this.defaultRedisClient,
    };

    const key = queueConfigKey(config.prefix, config.name);
    let manager = this.queueManagerMap.get(key);
    if (!manager) {
      const queue = new Queue(config.name, opts);
      await ensureScriptsLoaded(await queue.client);

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

  getQueueById(id: string): Queue | undefined {
    const manager = this.queueManagers.find((x) => x.id === id);
    return manager && manager.queue;
  }

  getQueue(nameOrPrefix: string, name?: string): Queue {
    let prefix = nameOrPrefix;
    if (arguments.length === 1) {
      name = nameOrPrefix;
      prefix = this.config.prefix;
    }
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

  async getQueueWorkers(): Promise<Map<Queue, QueueWorker[]>> {
    const queues = this.getQueues();
    const result = new Map<Queue, QueueWorker[]>();
    const queueByClientName = new Map<string, Queue>();
    queues.forEach((queue) => {
      const clientName = (queue as any).clientName();
      queueByClientName.set(clientName, queue);
      result.set(queue, []);
    });

    function parseClientList(list: string): void {
      const lines = list.split('\n');

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
        const queue = queueByClientName.get(name);
        if (queue) {
          const workers = result.get(queue);
          client['name'] = queue.name;
          workers.push(convertWorker(client));
        }
      });
    }

    const clients = await this.client.client('list');
    parseClientList(clients);

    return result;
  }

  async getWorkers(): Promise<QueueWorker[]> {
    const workers = await this.getQueueWorkers();
    const values = Array.from(workers.values()).reduce(
      (res, items) => res.concat(items),
      [],
    );
    return values;
  }

  async getJobCounts(states?: JobStatusEnum[]): Promise<JobCounts> {
    states = states?.length === 0 ? Object.values(JobStatusEnum) : states;
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

  async addFlow(flow: FlowJob): Promise<JobNode> {
    const producer = this.initFlowProducer();
    const linearJobs: FlowJob[] = [];
    const validationMap = new Map<FlowJob, JobValidationResult>();

    const validate = async (job: FlowJob): Promise<void> => {
      const { prefix = this.config.prefix, queueName, name, data, opts } = job;
      const queue = this.getQueue(prefix, queueName);
      if (!queue) {
        const msg = `Could not find queue "${queueName}" in host "${this.name}"`;
        throw boom.notFound(msg);
      }
      const validationResult = await validateJobData(queue, name, data, opts);
      validationMap.set(job, validationResult);
    };

    const gatherJobs = (jobsTree: FlowJob) => {
      linearJobs.push(jobsTree);
      const children = jobsTree.children;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          gatherJobs(children[i]);
        }
      }
    };

    gatherJobs(flow);

    await pMap(linearJobs, validate, { concurrency: 4 });
    // set defaults
    linearJobs.forEach((job) => {
      const result = validationMap.get(job);
      job.opts = { ...(job.opts || {}), ...(result.options || {}) };
      job.data = { ...(job.data || {}), ...(result.data || {}) };
    });

    return producer.add(flow);
  }

  async getFlow(opts: NodeOpts): Promise<JobNode> {
    return this.initFlowProducer().getFlow(opts);
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

  private createClient(redisOpts?: ConnectionOptions | string): RedisClient {
    if (this.defaultRedisClient && !redisOpts) {
      return this.defaultRedisClient.duplicate();
    }
    return createClient(redisOpts);
  }

  private ensureQueueId(config: QueueConfig): void {
    config.id =
      config.id || generateQueueId(this.config, config.prefix, config.name);
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
      } catch (e) {
        logger.error(e);
      }
    }
    return queues;
  }

  private async init(): Promise<void> {
    await ensureScriptsLoaded(this.defaultRedisClient);
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

  private initFlowProducer(): FlowProducer {
    if (!this.flowProducer) {
      const prefix = this.config.prefix;
      const client = this.createClient(this.connectionOpts);
      this.flowProducer = new FlowProducer({
        connection: client,
        prefix,
      });
    }
    return this.flowProducer;
  }
}
