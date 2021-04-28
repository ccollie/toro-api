import boom from '@hapi/boom';
import PQueue from 'p-queue';
import ms from 'ms';
import { Job, Queue } from 'bullmq';
import { StatsClient, StatsListener } from '../stats';
import { Rule, RuleManager } from '../rules';
import { EventBus, LockManager } from '../redis';
import { QueueListener } from './queue-listener';
import {
  convertWorker,
  deleteAllQueueData,
  getJobTypes,
  getMultipleJobsById,
} from './queue';
import { HostManager } from '../hosts';
import { getQueueUri, logger } from '../lib';
import {
  JobStatus,
  QueueConfig,
  QueueWorker,
  RepeatableJob,
  RuleAlert,
  RuleConfigOptions,
} from '../../types';
import cronstrue from 'cronstrue/i18n';
import { getQueueBusKey } from '../lib/keys';

const ALL_STATUSES: JobStatus[] = ['COMPLETED', 'WAITING', 'ACTIVE', 'FAILED'];

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
  readonly bus: EventBus;
  private readonly _workQueue: PQueue = new PQueue({ concurrency: 6 });
  public readonly statsListener: StatsListener;
  private _uri: string = undefined;
  private inStatsUpdate = false;

  constructor(host: HostManager, queue: Queue, config: QueueConfig) {
    this.host = host.name;
    this.hostManager = host;
    this.queue = queue;
    this.config = config;
    this.queueListener = this.createQueueListener();
    this.bus = new EventBus(host.streamAggregator, getQueueBusKey(queue));
    this.statsClient = new StatsClient(this);
    this.ruleManager = new RuleManager(this);
    this.statsListener = this.createStatsListener();
    this.onError = this.onError.bind(this);
    this.handleLockEvent = this.handleLockEvent.bind(this);
    this.init();
  }

  protected init(): void {
    if (this.hasLock) {
      process.nextTick(() => {
        this.catchupStats();
      });
    }
    this.lock.on(LockManager.ACQUIRED, this.handleLockEvent);
  }

  async destroy(): Promise<void> {
    this.lock.off(LockManager.ACQUIRED, this.handleLockEvent);
    await this.queueListener.destroy();
    this.bus.destroy();
    this.statsClient.destroy();
    this.ruleManager.destroy();
    this.statsListener.destroy();
    await this._workQueue.onIdle(); // should we just clear ?
    await this.queue.close();
  }

  onError(err: Error): void {
    // todo: log
    logger.warn(err);
    throw err;
  }

  catchupStats(): void {
    if (this.inStatsUpdate) return;
    const listener = this.createStatsListener();
    const catchup = (): Promise<void> => {
      this.inStatsUpdate = false;
      return listener.catchUp().finally(() => {
        this.inStatsUpdate = false;
        listener.destroy();
      });
    };
    this.addWork(catchup);
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

  get rules(): Rule[] {
    return this.ruleManager.rules;
  }

  private createQueueListener(): QueueListener {
    return new QueueListener(this.queue);
  }

  private createStatsListener(): StatsListener {
    return new StatsListener(this);
  }

  getRule(id: string): Promise<Rule> {
    return this.ruleManager.getRule(id);
  }

  addWork(fn: () => void | Promise<void>): void {
    this._workQueue.add(fn).catch((err) => {
      logger.warn(err);
    });
  }

  private handleLockEvent(): void {
    if (!this.inStatsUpdate) {
      this.catchupStats();
    }
  }

  /**
   *
   * @param {Rule} rule
   */
  async addRule(rule: RuleConfigOptions): Promise<Rule> {
    if (!rule) {
      throw boom.badRequest('must pass a valid rule');
    }
    const oldRule = await this.getRule(rule.id);
    if (oldRule) {
      throw boom.badRequest(`An rule named "${rule.id}" already exists`);
    }

    return this.ruleManager.addRule(rule);
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
      this.loadRules(),
      this.statsListener.startListening(),
      this.queueListener.startListening(),
    ]);
  }

  async isPaused(): Promise<boolean> {
    return this.queue.isPaused();
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
    return getMultipleJobsById(this.queue, ...ids);
  }

  /**
   * Fetch a number of jobs of certain type
   * @param {String} state Job states: {WAITING|ACTIVE|DELAYED|COMPLETED|FAILED}
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
        (job as any).queueId = this.id;
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

  async removeAllQueueData(): Promise<number> {
    return deleteAllQueueData(this.queue);
  }

  /**
   * Run queue garbage collection
   */
  sweep(): void {
    if (this.hasLock) {
      this._workQueue
        .addAll([
          () => this.statsListener.sweep(),
          () => this.ruleManager.pruneAlerts(),
          () => this.bus.cleanup(),
        ])
        .catch((err) => this.onError(err));
    }
  }
}
