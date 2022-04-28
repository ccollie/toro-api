import { badRequest, notFound } from '@hapi/boom';
import PQueue from 'p-queue';
import ms from 'ms';
import { Job, type JobState, Queue } from 'bullmq';
import { StatsClient } from '../stats/stats-client';
import { Rule, RuleManager } from '../rules';
import { RuleAlert, RuleConfigOptions } from '../types';
import { EventBus, LockManager } from '../redis';
import { QueueListener } from './queue-listener';
import { deleteAllQueueData, getJobTypes, getMultipleJobsById } from './queue';
import { HostManager, QueueConfig } from '../hosts';
import { Clock, getQueueUri } from '../lib';
import type { RepeatableJob } from '../types/queues';
import cronstrue from 'cronstrue/i18n';
import { getQueueBusKey } from '../keys';
import { MetricManager, Metric } from '../metrics';
import { getConfigDuration } from '../lib/config-utils';
import { logger } from '../logger';
import { convertWorker, QueueWorker } from './queue-worker';

const ALL_STATUSES: JobState[] = ['completed', 'waiting', 'active', 'failed'];

export function getCronDescription(cron: string | number): string {
  function fromNumber(value: number): string {
    return 'every ' + ms(value);
  }

  if (typeof cron === 'number') {
    return fromNumber(cron);
  } else {
    const millis = parseInt(cron, 10);
    if (!isNaN(millis)) {
      return fromNumber(millis);
    }
    try {
      return cron ? cronstrue.toString(cron) : '';
    } catch {
      return 'invalid';
    }
  }
}

const DEFAULT_RETENTION = ms('2 weeks');

function getRetention(): number {
  return getConfigDuration('DATA_RETENTION', DEFAULT_RETENTION);
}

/**
 * Maintain all data related to a queue
 * @property {RuleManager} ruleManager
 * @property {StatsClient} statsClient
 * @property {EventBus} bus
 * @property {QueueListener} queueListener
 * @property {Rule[]} rules
 */
export class QueueManager {
  public readonly host: string;
  public readonly queue: Queue;
  public readonly hostManager: HostManager;
  public readonly config: QueueConfig;
  readonly queueListener: QueueListener;
  readonly statsClient: StatsClient;
  readonly ruleManager: RuleManager;
  readonly metricManager: MetricManager;
  readonly bus: EventBus;
  readonly clock: Clock;
  private _isReadOnly = false;
  private readonly _workQueue: PQueue = new PQueue({ concurrency: 6 });
  private _uri: string = undefined;
  public readonly dataRetention = getRetention();

  constructor(host: HostManager, queue: Queue, config: QueueConfig) {
    this.host = host.name;
    this.hostManager = host;
    this.queue = queue;
    this.config = config;
    this.queueListener = this.createQueueListener();
    this.clock = this.queueListener.clock;
    this.bus = new EventBus(host.streamAggregator, getQueueBusKey(queue));

    this.statsClient = new StatsClient({
      queueId: this.id,
      queue,
      host: host.name,
    });
    this.metricManager = new MetricManager(this.queue, {
      host: this.host,
      bus: this.bus,
      client: this.hostManager.client
    });
    this._isReadOnly = !!config.isReadonly;
    this.ruleManager = new RuleManager(this);
    this.dispatchMetrics = this.dispatchMetrics.bind(this);
    this.onError = this.onError.bind(this);
    this.handleLockEvent = this.handleLockEvent.bind(this);
    this.init();
  }

  protected init(): void {
    this.lock.on(LockManager.ACQUIRED, this.handleLockEvent);
  }

  async destroy(): Promise<void> {
    this.lock.off(LockManager.ACQUIRED, this.handleLockEvent);
    this.metricManager.destroy();
    this.ruleManager.destroy();
    await this.queueListener.destroy();
    this.bus.destroy();
    this.statsClient.destroy();
    await this._workQueue.onIdle(); // should we just clear ?
    await this.queue.close();
  }

  onError(err: Error): void {
    // todo: log
    logger.warn(err);
    throw err;
  }

  get name(): string {
    return this.queue.name;
  }

  get prefix(): string {
    return this.queue.opts?.prefix;
  }

  get hostName(): string {
    return this.hostManager.name;
  }

  get id(): string {
    return this.config.id;
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
        prefix: this.prefix,
        host: {
          id: this.hostManager.id,
          name: this.hostManager.name,
        },
      };
      this._uri = getQueueUri(data);
    } catch (err) {
      this._uri = null;
      logger.warn(err);
    }
  }

  get lock(): LockManager {
    return this.hostManager.lock;
  }

  get hasLock(): boolean {
    return this.lock.isOwner;
  }

  get isReadonly() {
    return this._isReadOnly;
  }

  set isReadonly(value) {
    this._isReadOnly = value;
  }

  get rules(): Rule[] {
    return this.ruleManager.rules;
  }

  get metrics(): Metric[] {
    return this.metricManager.metrics;
  }

  private createQueueListener(): QueueListener {
    return new QueueListener(this.queue);
  }

  getRule(id: string): Promise<Rule> {
    return this.ruleManager.getRule(id);
  }

  findMetric(id: string): Metric {
    return this.metricManager.findMetricById(id);
  }

  addWork(fn: () => void | Promise<void>): void {
    this._workQueue.add(fn).catch((err) => {
      logger.warn(err);
    });
  }

  private handleLockEvent(): void {
  }

  protected dispatchMetrics({ metrics = [], ts }): void {
    metrics.forEach((metric) =>
      this.ruleManager.handleMetricUpdate(metric, ts),
    );
  }

  /**
   *
   * @param {Rule} rule
   */
  async addRule(rule: RuleConfigOptions): Promise<Rule> {
    if (!rule) {
      throw badRequest('must pass a valid rule');
    }
    if (rule.id) {
      const oldRule = await this.getRule(rule.id);
      if (oldRule) {
        throw badRequest(`An rule with id "${rule.id}" already exists`);
      }
    }
    if (!rule.metricId) {
      throw badRequest('No metric id was specified');
    }

    const metric = this.findMetric(rule.metricId);
    if (!metric) {
      throw badRequest(
        `No metric with id "${rule.metricId}" was found in queue "${this.name}"`,
      );
    }

    return this.ruleManager.addRule(rule);
  }

  async updateRule(rule: Rule): Promise<Rule> {
    if (!rule) {
      throw badRequest('must pass a valid rule');
    }
    const oldRule = await this.getRule(rule.id);
    if (!oldRule) {
      throw notFound(
        `No rule with id "${rule.id}" found in queue "${this.name}"`,
      );
    }
    if (!rule.metricId) {
      throw badRequest('No metric id was specified');
    }

    const metric = this.findMetric(rule.metricId);
    if (!metric) {
      throw badRequest(
        `No metric with id "${rule.metricId}" was found in queue "${this.name}"`,
      );
    }

    return this.ruleManager.updateRule(rule);
  }

  /**
   * Delete a {@link Rule}
   * @param {Rule|string} rule
   * @return {Promise<void>}
   */
  async deleteRule(rule: Rule | string): Promise<boolean> {
    return this.ruleManager.deleteRule(rule);
  }

  async loadRules(): Promise<Rule[]> {
    return this.ruleManager.loadRules();
  }

  async getAlertCount(): Promise<number> {
    return this.ruleManager.getRuleAlertCount();
  }

  async getAlerts(
    start: any = '-',
    end: any = '+',
    asc = true,
    limit?: number,
  ): Promise<RuleAlert[]> {
    return this.ruleManager.storage.getAlerts(start, end, asc, limit);
  }

  async listen(): Promise<void> {
    await Promise.all([
      this.queueListener.startListening(),
    ]);
    this.metricManager.onMetricsUpdated(this.dispatchMetrics);
    await this.loadRules();
    await this.metricManager.start();
  }

  async isPaused(): Promise<boolean> {
    return this.queue.isPaused();
  }

  async pause(): Promise<void> {
    await this.queue.pause();
    this.metricManager.stop();
  }

  async resume(): Promise<void> {
    await this.queue.resume();
    await this.metricManager.start();
  }

  /****
   * A more performant way to fetch multiple getJobs from a queue.
   * The standard method in Bull makes a round trip per job. This
   * method uses pipelining to get all getJobs in a single round-trip
   * @param  ids job ids
   * @returns {Promise<[Job]>}
   */
  async getMultipleJobsById(...ids: (string | string[])[]): Promise<Job[]> {
    return getMultipleJobsById(this.queue, ...ids);
  }

  /**
   * Fetch a number of jobs of certain type
   * @param {String} states Job states: {WAITING|ACTIVE|DELAYED|COMPLETED|FAILED}
   * @param {Number} offset Index offset (optional)
   * @param {Number} limit Limit of the number of getJobs returned (optional)
   * @param asc {Boolean} asc/desc
   * @returns {Promise} A promise that resolves to an array of Jobs
   */
  async getJobs(
    states: JobState[],
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

    if (asc === undefined && states?.length === 1) {
      asc = order[states[0]];
    }
    const end = limit < 0 ? -1 : offset + limit - 1;

    const ids = await this.queue.getRanges(states, offset, end, asc);
    let jobs = [];
    if (ids.length) {
      jobs = await this.getMultipleJobsById(ids as string[]);
      jobs.forEach((job) => {
        (job as any).queueId = this.id;
        if (states.length === 1) job.state = states[0];
      });
    }

    return jobs;
  }

  async getJobCounts(
    states: JobState[] = ALL_STATUSES,
  ): Promise<Record<JobState, number>> {
    let result = await this.queue.getJobCounts(...states);
    if (!result) result = {};
    states.forEach((state) => {
      if (typeof result[state] !== 'number') {
        result[state] = 0;
      }
    });
    return result as Record<JobState, number>;
  }

  /**
   * Fetch a number of repeatable jobs
   * @param {Number} [offset] Index offset (optional)
   * @param {Number} limit Limit of the number of jobs returned (optional)
   * @param asc {Boolean} asc/desc
   * @returns {Promise} A promise that resolves to an array of repeatable jobs
   */
  async getRepeatableJobs(
    offset = 0,
    limit = 30,
    asc = true,
  ): Promise<RepeatableJob[]> {
    const end = limit < 0 ? -1 : offset + limit - 1;

    const response = await this.queue.getRepeatableJobs(offset, end, !!asc);

    return response.map((job: RepeatableJob) => {
      job.descr = getCronDescription(job.cron);
      return job;
    });
  }

  /**
   * Returns a promise that resolves to the quantity of repeatable jobs.
   */
  async getRepeatableCount(): Promise<number> {
    const repeat = await this.queue.repeat;
    return repeat.getRepeatableCount();
  }

  // TODO: deleteRepeatable
  async getJobTypes(): Promise<string[]> {
    return getJobTypes(this.hostManager.name, this.queue);
  }

  async getWorkers(): Promise<QueueWorker[]> {
    const workers = await this.queue.getWorkers();
    return workers.map(convertWorker);
  }

  async getWorkerCount(): Promise<number> {
    const workers = await this.getWorkers();
    return workers.length;
  }

  async removeAllQueueData(): Promise<void> {
    await deleteAllQueueData(this.queue);
  }

  /**
   * Run queue garbage collection
   */
  sweep(): void {
    if (this.hasLock) {
      this._workQueue
        .addAll([
          () => this.metricManager.pruneData(),
          () => this.ruleManager.pruneAlerts(this.dataRetention),
          () => this.bus.cleanup(),
        ])
        .catch((err) => this.onError(err));
    }
  }
}
