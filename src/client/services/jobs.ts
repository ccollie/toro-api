import { downloadJson } from '../common/downloads';
import { safeParse } from '../common/utils';
import Request from './request';
import { JobId } from './types';

export interface JobData {
  id: string | number | undefined;
  name: string;
  data: string;
  opts: object;
  state?: string;
  duration?: number;
  waitTime?: number;
  nextRun?: number;
  progress: number | object;
  attemptsMade: number;
  finishedOn: number | null;
  processedOn: number;
  timestamp?: number;
  failedReason: string;
  stacktrace: string[] | null;
  returnvalue: string;
  logs?: any[];
}

/**
 * Utility function to construct a url
 * @param {string} host
 * @param {string} name
 * @param {string[] | number []} args
 */
function getUrl(host: string, name: string, ...args) {
  const base = `queues/${encodeURIComponent(host)}/${encodeURIComponent(name)}`;
  const fragment = args.join('/');
  return args.length ? `${base}/${fragment}` : base;
}

function jobUrl(host: string, name: string, id: JobId, ...args) {
  return getUrl(host, name, 'jobs', id, ...args);
}

/**
 * Generate a stream name for realtime job updates
 * @param {string} host the queue host
 * @param {string | object} queue the queue
 * @param {String | Number} jobId the job id
 */
function getJobStreamName(host: string, queue, jobId: JobId) {
  const name = queue && queue.name ? queue.name : queue;
  return `jobs://${host}/${name}/${jobId}`;
}

/**
 * @param {string | number | object} value
 */
function normalizedProgress(value) {
  const type = typeof value;
  if (type === 'object') {
    return value;
  }
  if (type === 'string') {
    const numeric = parseInt(value, 10);
    if (!isNaN(numeric)) {
      return numeric;
    }
    return safeParse(value);
  }
  return value;
}

function normalizeJob(job): JobData {
  if (!job) {
    return job;
  }
  job.data = safeParse(job.data) || {};
  job.opts = safeParse(job.opts) || {};
  job.stacktrace = safeParse(job.stacktrace) || [];
  job.progress = normalizedProgress(job.progress);
  job.returnvalue = safeParse(job.returnvalue);
  if (job.finishedOn) {
    job.duration = job.finishedOn - job.processedOn;
  }
  if (job.processedOn && job.processedOn > job.timestamp) {
    job.waitTime = job.processedOn - job.timestamp;
  } else {
    job.waitTime = 0;
  }
  if (job.state === 'active') {
    job.duration = Date.now() - job.processedOn;
  } else if (job.state === 'delayed') {
    if (!isNaN(job.delay)) {
      job.nextRun = job.timestamp + job.delay;
    }
  }
  return job;
}

export class JobService {
  constructor(private http: Request) {}

  /**
   * Fetch a job
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string | number} id the job id
   * @param {boolean} includeLogs additionally fetch the job logs
   * @returns {Promise<object>}
   */
  async getJob(
    host: string,
    queue: string,
    id: JobId,
    includeLogs = false,
  ): Promise<JobData> {
    let job = await this.http.get(jobUrl(host, queue, id), { includeLogs });
    if (job) {
      job = normalizeJob(job);
    }
    return job;
  }

  /**
   * Retrieve the logs for a job
   * @param {string} host
   * @param {string} queue
   * @param {string | number} id
   * @param {number} start
   * @param {number} end
   */
  getJobLogs(host: string, queue: string, id: string | number, start, end) {
    const queryParams = {
      start,
      end,
    };
    return this.http.get(jobUrl(host, queue, id, 'logs'), queryParams);
  }

  /**
   * Get the job state
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string | number} id the job id
   * @returns {Promise<string>} the job state
   */
  getJobState(
    host: string,
    queue: string,
    id: string | number,
  ): Promise<string> {
    return this.http.get(jobUrl(host, queue, id, 'state'));
  }

  /**
   * Fetch getJobs
   * @param {string} host the queue host
   * @param {string} name queue name
   * @param {string | any[]} state job states to return getJobs for
   * @param {number} offset start offset
   * @param {number} limit the maximum number of records to return
   * @param {boolean} asc sort ascending
   */
  async getJobs(
    host: string,
    name: string,
    state,
    offset = 0,
    limit = 25,
    asc,
  ) {
    if (!Array.isArray(state)) state = [state];
    const data = { offset, limit, state, asc };
    const response = await this.http.get(getUrl(host, name, 'jobs'), data);

    if (response && Array.isArray(response.jobs)) {
      response.jobs = response.jobs.map(normalizeJob);
      if (state.length === 1) {
        response.jobs.forEach((job) => {
          job.state = state[0];
        });
      }
    }

    return response;
  }

  /**
   * Fetch and download getJobs
   * @param {string} host
   * @param {string} name queue name
   * @param {string} state the job state for which to download getJobs
   * @returns {Promise<any>}
   */
  async downloadJobs(host: string, name: string, state: string): Promise<any> {
    const response = await this.http.get(getUrl(host, name, 'jobs'), {
      state,
      export: 1,
    });
    const filename = `${name}-${state}-dump.json`;
    return downloadJson(response, filename);
  }

  /**
   * Fetch a job and trigger a browser download
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string | number} id the job id
   */
  async downloadJob(host: string, queue, id: JobId) {
    const job = await this.getJob(host, queue, id, true);
    // todo: set target to _blank
    const filename = `${queue}-${job.name}-${job.id}-dump.json`;
    return downloadJson(job, filename);
  }

  /**
   * Retry a job
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string | number} id the job id
   */
  retryJob(host: string, queue: string, id: JobId) {
    return this.http.post(jobUrl(host, queue, id, 'retry'));
  }

  /**
   * Delete a job
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string | number} id the job id
   */
  deleteJob(host: string, queue: string, id: JobId) {
    return this.http.del(getUrl(host, queue, 'jobs', id));
  }

  /**
   * Promote a job to "active" stats
   * @param {string} host  queue host
   * @param {string | object} queue queue name or instance
   * @param {string | number} id the job id
   */
  promoteJob(host: string, queue, id: JobId) {
    return this.http.post(jobUrl(host, queue, id, 'promote'));
  }

  /**
   * Perform an action on multiple getJobs
   * @param {string} host queue host
   * @param {string} queue queue name
   * @param {string} action
   * @param {string[] | number[]} ids the job ids
   */
  bulkJobAction(host: string, queue: string, action: string, ids) {
    return this.http.post(getUrl(host, queue, 'bulk-getJobs', action), {
      jobs: ids,
    });
  }

  /**
   * For getJobs with a delay, calculate the time in ms until it's next scheduled execution
   * @param job
   * @returns {number}
   */
  getTimeToNextExecution(job): number {
    if (!job.delay) {
      return 0;
    }
    const delay = job.timestamp + job.delay - Date.now();
    return delay < 0 ? 0 : delay;
  }
}
