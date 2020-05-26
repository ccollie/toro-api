import { CleanOptions, QueueService } from '../services/queues';
import { JobData, JobService } from '../services/jobs';
import { EventHandlerMap, JobId } from '../services/types';
import { WorkerService } from '../services/workers';
import { MetricsService, MetricType } from '../services/metrics';
import {
  ScheduledJobFetchOptions,
  ScheduledJobsService,
} from '../services/scheduled-jobs';

class JobsClient {
  private readonly service: JobService;
  private readonly queue: QueueClient;

  constructor(queue: QueueClient, service: JobService) {
    this.queue = queue;
    this.service = service;
  }

  get host(): string {
    return this.queue.host;
  }

  /**
   * Subscribe to receive job updates
   * @param {string | number} jobId
   * @param {EventHandlerMap?} handlers
   */
  subscribe(jobId: JobId, handlers?: EventHandlerMap) {
    return this.service.subscribe(this.host, this.queue.name, jobId, handlers);
  }

  /**
   * Fetch a job
   * @param {string | number} id the job id
   * @param {boolean} includeLogs additionally fetch the job logs
   * @returns {Promise<object>}
   */
  async getById(id: JobId, includeLogs = false): Promise<JobData> {
    return this.service.getJob(this.host, this.queue.name, id, includeLogs);
  }

  /**
   * Retrieve the logs for a job
   * @param {string | number} id
   * @param {number} start
   * @param {number} end
   */
  getLogs(id: string | number, start: number, end: number) {
    return this.service.getJobLogs(this.host, this.queue.name, id, start, end);
  }

  /**
   * Get the job state
   * @param {string | number} id the job id
   * @returns {Promise<string>} the job state
   */
  getState(id: string | number): Promise<string> {
    return this.service.getJobState(this.host, this.queue.name, id);
  }

  /**
   * Fetch getJobs
   * @param {string | any[]} state job states to return getJobs for
   * @param {number} offset start offset
   * @param {number} limit the maximum number of records to return
   * @param {boolean} asc sort ascending
   */
  async getJobs(state: string, offset = 0, limit = 25, asc: boolean) {
    return this.service.getJobs(
      this.host,
      this.queue.name,
      state,
      offset,
      limit,
      asc,
    );
  }

  /**
   * Fetch and download getJobs
   * @param {string} state the job state for which to download getJobs
   * @returns {Promise<any>}
   */
  async downloadJobs(state: string): Promise<any> {
    return this.service.downloadJobs(this.host, this.queue.name, state);
  }

  /**
   * Fetch a job and trigger a browser download
   * @param {string | number} id the job id
   */
  async download(id: JobId) {
    return this.service.downloadJob(this.host, this.queue.name, id);
  }

  /**
   * Retry a job
   * @param {string | number} id the job id
   */
  retry(id: JobId) {
    return this.service.retryJob(this.host, this.queue.name, id);
  }

  /**
   * Retry all failed getJobs
   */
  retryFailed() {
    return this.queue.retryFailed();
  }

  /**
   * Delete a job
   * @param {string | number} id the job id
   */
  delete(id: JobId) {
    return this.service.deleteJob(this.host, this.queue.name, id);
  }

  /**
   * Promote a job to "active" stats
   * @param {string | number} id the job id
   */
  promote(id: JobId) {
    return this.service.promoteJob(this.host, this.queue.name, id);
  }

  /**
   * Perform an action on multiple getJobs
   * @param {string} action
   * @param {string[] | number[]} ids the job ids
   */
  bulk(action: string, ids) {
    return this.service.bulkJobAction(this.host, this.queue.name, action, ids);
  }
}

class ScheduledJobsClient {
  readonly queue: QueueClient;
  readonly service: ScheduledJobsService;

  constructor(queue: QueueClient, service: ScheduledJobsService) {
    this.queue = queue;
    this.service = service;
  }

  /**
   * Fetch scheduled getJobs
   * @param {object} options
   * @param {number?} options.offset offset of first job. Default 0
   * @param {number?} options.count  number of getJobs to return. Default -1 (return all)
   * @param {boolean?} options.asc  true to sort in ascending order
   */
  async getJobs(options?: ScheduledJobFetchOptions): Promise<object[]> {
    return this.service.getJobs(this.queue.host, this.queue.name, options);
  }

  deleteByKey(keys: string | string[]): Promise<string[]> {
    return this.service.deleteByKey(this.queue.host, this.queue.name, keys);
  }
}

class WorkersClient {
  private readonly client: WorkerService;
  private readonly queue: QueueClient;

  constructor(queue: QueueClient, client: WorkerService) {
    this.client = client;
    this.queue = queue;
  }

  getAll() {
    return this.client.getWorkers(this.queue.host, this.queue.name);
  }
}

class MetricsClient {
  readonly service: MetricsService;
  readonly queue: QueueClient;

  constructor(queue: QueueClient, service: MetricsService) {
    this.queue = queue;
    this.service = service;
  }

  getLatencySnapshot(jobType = null) {
    return this.service.getLatencySnapshot(
      this.queue.host,
      this.queue.name,
      jobType,
    );
  }

  getLatency(jobType = null, options) {
    return this.service.getLatency(
      this.queue.host,
      this.queue.name,
      jobType,
      options,
    );
  }

  getWaitTime(jobType = null, options = {}) {
    return this.service.getWaitTime(
      this.queue.host,
      this.queue.name,
      jobType,
      options,
    );
  }

  getThroughput(jobType = null, options = {}) {
    return this.service.getThroughput(
      this.queue.host,
      this.queue.name,
      jobType,
      options,
    );
  }

  getThroughputSnapshot(jobType = null, options = {}) {
    return this.service.getThroughputSnapshot(
      this.queue.host,
      this.queue.name,
      jobType,
      options,
    );
  }

  getLast(metric: MetricType, options) {
    return this.service.getLast(
      this.queue.host,
      this.queue.name,
      metric,
      options,
    );
  }

  getSpan(metric: MetricType, options) {
    return this.service.getSpan(
      this.queue.host,
      this.queue.name,
      metric,
      options,
    );
  }
}

export class QueueClient {
  private readonly _host;
  private readonly _name;
  readonly service: QueueService;
  readonly jobsClient: JobsClient;
  readonly metrics: MetricsClient;
  readonly workers: WorkersClient;
  readonly scheduledJobs: ScheduledJobsClient;

  constructor(
    service: QueueService,
    jobs: JobService,
    scheduledJobs: ScheduledJobsService,
    workers: WorkerService,
    metrics: MetricsService,
    public host: string,
    public name: string,
  ) {
    this._host = host;
    this._name = name;
    this.service = service;
    this.metrics = new MetricsClient(this, metrics);
    this.jobsClient = new JobsClient(this, jobs);
    this.workers = new WorkersClient(this, workers);
    this.scheduledJobs = new ScheduledJobsClient(this, scheduledJobs);
  }

  get jobs(): JobsClient {
    return this.jobsClient;
  }

  /**
   * Fetch a queue by host and name
   */
  async load() {
    return this.service.get(this.host, this.name);
  }

  /**
   * Pause a queue
   */
  async pause(): Promise<boolean> {
    return this.service.pause(this._host, this.name);
  }

  /**
   * Resume a queue
   */
  async resume(): Promise<boolean> {
    return this.service.resume(this._host, this._name);
  }

  /*@function clean
   *
   * Cleans getJobs from a queue. Similar to remove but keeps getJobs within a certain
   * grace period.
   * @param {CleanOptions} options clean options
   * @param {number} options.grace - The grace period
   * @param {number} options.limit The max number of getJobs to clean
   * @param {string} options.stats The type of job to clean
   * Possible values are completed, wait, active, paused, delayed, failed. Defaults to completed.
   * @returns {Promise<string[]>} the ids of the removed getJobs
   */
  clean(
    options: CleanOptions = {
      status: 'completed',
      limit: 1000,
      grace: 5000,
    },
  ): Promise<string[]> {
    return this.service.clean(this._host, this._name, options);
  }

  /**
   * Retry all failed getJobs
   */
  retryFailed() {
    return this.service.retryFailed(this._host, this._name);
  }

  /**
   * @param {string} jobType job type (job name)
   * @param {any[]} args
   * @returns {string}
   */
  constructStreamName(jobType: string = null, ...args): string {
    let base = `queues://${this.host}/${this.name}`;
    if (jobType) {
      base += `/type/${jobType}`;
    }
    const fragment = args.join('/');
    return args.length ? `${base}/${fragment}` : base;
  }
}
