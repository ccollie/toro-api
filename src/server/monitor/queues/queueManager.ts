import boom from '@hapi/boom';
import PQueue from 'p-queue';
import ms from 'ms';
import { Job, Queue } from 'bullmq';
import { StatsAggregator, StatsClient, StatsListener } from '../stats';
import { Rule, RuleManager } from '../rules';
import { QueueSweeper } from './queueSweeper';
import { deleteAllQueueData, RedisStreamAggregator } from '../../redis';
import { QueueListener } from './queueListener';
import { QueueBus } from './queueBus';
import { HostContext } from '../hostManager';
import { getJobTypes } from '../../models/queues';
import { subscribeToJob } from '../lib/keyspace-utils';
import { systemClock } from '../../lib/clock';
import { getStatsKey } from '../keys';
import { QueueConfig, QueueWorker, RepeatableJob, RuleAlert } from '@src/types';
import { isEmpty } from 'lodash';
import { JobStatus } from 'jobs';
import cronstrue from 'cronstrue/i18n';

const JANITOR = Symbol('janitor');
const STATS_AGGREGATOR = Symbol('stats aggregator');
const STATS_LISTENER = Symbol('stats listener');

const ALL_STATUSES: JobStatus[] = ['completed', 'waiting', 'active', 'failed'];

export function getCronDescription(cron): string {
  if (!isNaN(cron)) {
    return 'every ' + ms(parseInt(cron));
  }
  return cron ? cronstrue.toString(cron) : '';
}

/**
 * Maintain all data related to a queue
 * @property {RuleManager} ruleManager
 * @property {StatsClient} statsClient
 * @property {QueueBus} bus
 * @property {QueueListener} queueListener
 * @property {Rule[]} rules
 */
export class QueueManager {
  public readonly host: string;
  public readonly queue: Queue;
  private readonly streamAggregator: RedisStreamAggregator;
  readonly queueListener: QueueListener;
  private readonly statsClient: StatsClient;
  readonly bus: QueueBus;
  private readonly config: QueueConfig;
  rules: Rule[];
  public readonly ruleManager: RuleManager;
  private readonly _context: HostContext;
  private readonly _workQueue: PQueue = new PQueue({ concurrency: 6 });

  constructor(context: HostContext, queue: Queue, config: QueueConfig) {
    this.host = context.host;
    this.queue = queue;
    this.config = config;
    this._context = { ...context };
    this.streamAggregator = context.streamAggregator;
    this.rules = [];
    this.queueListener = this.createQueueListener();
    this.statsClient = new StatsClient(
      this.host,
      queue,
      config,
      context.writer,
    );
    this.bus = new QueueBus(this.streamAggregator, queue, this.host);
    this.ruleManager = new RuleManager(this.host, queue, this.bus);
    this[JANITOR] = new QueueSweeper(this, config);
    this[STATS_LISTENER] = new StatsListener(
      this.queueListener,
      this.statsClient,
    );
    this[STATS_AGGREGATOR] = new StatsAggregator(
      this.host,
      queue,
      config,
      this.statsClient,
      this._workQueue,
    );
  }

  async destroy(): Promise<void> {
    this.rules.forEach((rule) => rule.destroy());
    this.rules = [];
    await this.queueListener.destroy();
    this.bus.destroy();
    this.statsClient.destroy();
    this.ruleManager.destroy();
    this[JANITOR].destroy();
    this[STATS_LISTENER].destroy();
    this[STATS_AGGREGATOR].destroy();
    await this._workQueue.onIdle(); // should we just clear ?
    await this.queue.close();
  }

  get name(): string {
    return this.queue.name;
  }

  get id(): string {
    return this.config.id;
  }

  get hasLock(): boolean {
    return this._context.writer.hasLock;
  }

  createQueueListener(): QueueListener {
    return new QueueListener(this.host, this.queue);
  }

  getRule(name: string): Rule {
    return this.rules.find((rule) => rule.name === name || rule.id === name);
  }

  /**
   *
   * @param {Rule} rule
   */
  async addRule(rule): Promise<Rule> {
    if (!rule) {
      throw boom.badRequest('must pass a valid rule');
    }
    if (this.getRule(rule.id)) {
      throw boom.badRequest(`An rule named "${rule.id}" already exists`);
    }

    const newRule = this.ruleManager.addRule(rule);

    this._addRule(newRule);
    return newRule;
  }

  /**
   * @private
   * @param {Rule} rule
   */
  private _addRule(rule): void {
    if (!rule) {
      throw boom.badRequest('must pass a valid rule object');
    }
    if (this.getRule(rule.id)) {
      throw boom.badRequest(`An rule with id "${rule.id}" already exists`);
    }
    rule.queueId = this.id;

    const alertHandler = async (eventName: string, alert): Promise<void> => {
      if (this.hasLock) {
        const calls = [];

        if (rule.persist) {
          calls.push(this.ruleManager.addAlert(rule, eventName, alert));
        }
        if (rule.notifiers.length) {
          calls.push(this.notifyAlert(rule, alert));
        }

        await Promise.all(calls);
      }
    };

    ['alert.triggered', 'alert.reset'].forEach((eventName) => {
      rule.on(eventName, (data) => alertHandler(eventName, data));
    });

    this.rules.push(rule);
  }

  private _deleteRule(rule): boolean {
    const id = rule && (rule.id || rule);
    const index = this.rules.findIndex((x) => x.id === id);
    if (index >= 0) {
      this.rules.slice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Delete a {@link Rule}
   * @param {Rule|string} rule
   * @return {Promise<void>}
   */
  async deleteRule(rule: Rule | string): Promise<void> {
    let id;
    if (typeof rule === 'string') {
      id = rule;
    } else {
      id = rule.id;
    }
    const _rule = this.getRule(id);
    if (_rule) {
      await this.ruleManager.deleteRule(_rule);
      this._deleteRule(_rule);
    }
  }

  notifyAlert(rule: Rule, info: RuleAlert): Promise<number> {
    const { notifications } = this._context;
    return notifications.dispatch(info.event, this.queue, info, rule.notifiers);
  }

  async loadRules(): Promise<Rule[]> {
    const rules = await this.ruleManager.getRules();
    rules.forEach((rule) => this._addRule(rule));
    return rules;
  }

  async listen(): Promise<void> {
    const statsListener = this[STATS_LISTENER] as StatsListener;
    await Promise.all([
      this.loadRules(),
      statsListener.startListening(),
      this.queueListener.startListening(),
    ]);
  }

  async isPaused(): Promise<boolean> {
    const client = await this.queue.client;
    const meta = await client.hgetall(this.queue.keys.meta);
    return meta?.paused ? !!+meta.paused : false;
  }

  pause(): Promise<void> {
    return this.queue.pause();
  }

  resume(): Promise<void> {
    return this.queue.resume();
  }

  /****
   * A more performant way to fetch multiple getJobs from a queue.
   * The standard method in Bull makes a round trip per job. This
   * method uses pipelining to get all getJobs in a single roundtrip
   * @param  ids job ids
   * @returns {Promise<[Job]>}
   */
  async getMultipleJobsById(...ids: (string | string[])[]): Promise<Job[]> {
    const flat = [].concat(...ids);
    const client = await this.queue.client;
    const multi = client.multi();
    flat.forEach((jid) => {
      multi.hgetall(this.queue.toKey(jid));
    });
    const res = await multi.exec();
    const result = [];

    res.forEach((item, index) => {
      if (item[0]) {
        // err
      } else {
        const jobData = item[1];
        const jid = flat[index];
        if (!isEmpty(jobData)) {
          const job = Job.fromJSON(this.queue, jobData, jid);
          result.push(job);
        }
      }
    });
    return result;
  }

  /**
   * Fetch a number of getJobs of certain type
   * @param {String} state Job state: {waiting|active|delayed|completed|failed}
   * @param {Number} offset Index offset (optional)
   * @param {Number} limit Limit of the number of getJobs returned (optional)
   * @param asc {Boolean} asc/desc
   * @returns {Promise} A promise that resolves to an array of Jobs
   */
  async getJobs(
    state: JobStatus,
    offset = 0,
    limit = 25,
    asc?: boolean,
  ): Promise<Job[]> {
    const order = {
      waiting: true,
      active: false,
      delayed: true,
      completed: false,
      failed: false,
    };

    if (asc === undefined) {
      asc = order[state];
    }
    const end = limit < 0 ? -1 : offset + limit - 1;

    // eslint-disable-next-line prefer-const
    const ids = await this.queue.getRanges([state], offset, end, asc);
    let jobs = [];
    if (ids.length) {
      jobs = await this.getMultipleJobsById(ids as string[]);
      jobs.forEach((job) => {
        job.state = state;
      });
    }

    return jobs;
  }

  async getJobCounts(
    states: JobStatus[] = ALL_STATUSES,
  ): Promise<Record<JobStatus, number>> {
    let result = await this.queue.getJobCounts(...states);
    if (!result) result = {};
    states.forEach((state) => {
      if (typeof result[state] !== 'number') {
        result[state] = 0;
      }
    });
    return result as Record<JobStatus, number>;
  }

  /**
   * Fetch a number of repeatable getJobs
   * @param {Number} [offset] Index offset (optional)
   * @param {Number} limit Limit of the number of getJobs returned (optional)
   * @param asc {Boolean} asc/desc
   * @returns {Promise} A promise that resolves to an array of repeatable getJobs
   */
  async getRepeatableJobs(offset = 0, limit = 30, asc = true) {
    const end = limit < 0 ? -1 : offset + limit - 1;

    const response = await this.queue.getRepeatableJobs(offset, end, !!asc);

    return response.map((job: RepeatableJob) => {
      job.descr = getCronDescription(job.cron);
      return job;
    });
  }

  /**
   * Returns a promise that resolves to the quantity of repeatable getJobs.
   */
  async getRepeatableCount(): Promise<number> {
    const repeat = await this.queue.repeat;
    return repeat.getRepeatableCount();
  }

  // TODO: deleteRepeatable

  async moveJobToDelayed(id: string, delay: number) {
    const job = await this.queue.getJob(id);
    if (!job) {
      throw new boom.notFound('Job not found!');
    }
    const runAt = systemClock.now() + delay;
    await job.moveToDelayed(runAt);
    return {
      runAt,
      job,
    };
  }

  async removeRepeatableJob(key: string) {
    await this.queue.removeRepeatableByKey(key);
    // todo: emit event
  }

  async getJobTypes(): Promise<string[]> {
    return getJobTypes(this.host, this.queue);
  }

  async getWorkers(): Promise<QueueWorker[]> {
    const INT_FIELDS = [
      'id',
      'age',
      'idle',
      'db',
      'qbuf',
      'qbuf-free',
      'sub',
      'obl',
      'omem',
    ];
    const workers = await this.queue.getWorkers();
    const now = systemClock.now();
    const list = [];
    workers.forEach((worker) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { fd, psub, multi, addr: address, ...res } = worker;
      const [addr, port] = address.split(':');

      const result: Record<string, any> = {
        ...res,
      };
      res.addr = addr;
      if (port) {
        result.port = parseInt(port);
      }
      const id = parseInt(res.id);
      if (!isNaN(id)) result.id = id;
      INT_FIELDS.forEach((field) => {
        result[field] = parseInt(res[field]);
      });
      result.started = now - result.age * 1000;
      list.push(result as QueueWorker);
    });

    return list as QueueWorker[];
  }

  async getWorkerCount(): Promise<number> {
    const workers = await this.getWorkers();
    return workers.length;
  }

  async removeAllQueueData(): Promise<number> {
    return deleteAllQueueData(this.queue);
  }

  /// Stream Event Subscriptions
  async subscribeToJob(jobId: string, handler) {
    const jobKey = this.queue.toKey(jobId);
    // unfortunately, a job's state is not stored on the job itself, but is
    // derived in the implementation from which of the queue lists it exists
    // in at the moment. Instead of having to query redis, we add a listener to
    // this listener and filter out based on id. This means that we should
    // probably limit the number of getJobs we watch

    let unsubCalled = false;
    let state = null;

    const stateHandler = async (data): Promise<void> => {
      const { timestamp, job } = data;
      // we're only handling realtime events, so skip anything old
      if (systemClock.now() - timestamp > 1000) {
        return;
      }
      if (state === null) {
        state = job.state;
      } else {
        if (state !== job.state) {
          state = job.state;
          await handler('state', job.state);
        }
      }
    };

    const localCleanup = this.queueListener.on(`job.${jobId}`, stateHandler);

    const unsubKeyMonitor = await subscribeToJob(
      this._context.keyspaceNotifier,
      jobKey,
      handler,
    );

    async function unsubscribe(): Promise<void> {
      if (!unsubCalled) {
        unsubCalled = true;
        localCleanup();
        return unsubKeyMonitor();
      }
    }

    return unsubscribe;
  }

  async subscribeToStream(key: string, offset, handler) {
    if (typeof offset === 'function') {
      handler = offset;
      offset = '$';
    }
    await this.streamAggregator.subscribe(key, offset, handler);
    return () => this.streamAggregator.unsubscribe(key, handler);
  }

  async subscribeToQueue(
    jobType: string,
    tag: string,
    offset,
    handler,
  ): Promise<() => void> {
    const key = getStatsKey(this.host, this.queue, jobType, tag);
    return this.subscribeToStream(key, offset, handler);
  }

  async subscribeLatency(jobType: string, handler): Promise<() => void> {
    return this.subscribeToQueue(jobType, 'latency', '$', handler);
  }

  async subscribeWaitTime(jobType: string, handler) {
    return this.subscribeToQueue(jobType, 'wait', '$', handler);
  }

  async subscribeAlert(name: string, handler): Promise<() => void> {
    if (typeof name === 'function') {
      handler = name;
      name = null;
    } else {
      const rule = this.getRule(name);
      if (!rule) {
        throw boom.notFound(
          `No rule named "${name}" found for queue "${this.queue.name}"`,
        );
      }
    }

    let cleanups = [];

    const registerHandler = async (eventName: string): Promise<void> => {
      const fn = (data) => {
        const alertName = data.name;
        if (!name || alertName === name) {
          return handler(eventName, data);
        }
      };

      cleanups.push(await this.bus.on(`alert.${eventName}`, fn));
    };

    await Promise.all([
      registerHandler('added'),
      registerHandler('updated'),
      registerHandler('cleanup'),
    ]);

    function unsub(): void {
      cleanups.forEach((fn) => fn());
      cleanups = [];
    }

    return unsub;
  }
}
