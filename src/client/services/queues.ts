import { isObject } from '../common/utils';
import { EventHandlerMap, JobStatus } from './types';

export interface StreamNameOptions {
  host?: string;
  name?: string;
  queue?: { name: string; host: string };
  streamName?: string;
  jobType?: string;
  type?: string;
  granularity?: string;
}

export interface CleanOptions {
  limit?: number;
  status?: JobStatus;
  grace?: number;
}

/**
 * @param {string} host queue host
 * @param {string} name queue name
 * @param {(string | any)[]} args
 * @returns {string}
 */
function getUrl(host: string, name: string, ...args): string {
  const base = `queues/${encodeURIComponent(host)}/${encodeURIComponent(name)}`;
  const fragment = args.join('/');
  return args.length ? `${base}/${fragment}` : base;
}

/**
 * @param {string} host
 * @param {string | object} queue queue
 * @param {string} jobType job type (job name)
 * @param {any[]} args
 * @returns {string}
 */
function constructStreamName(
  host: string,
  queue,
  jobType = null,
  ...args
): string {
  const name = queue && queue.name ? queue.name : queue;
  let base = `queues://${host}/${name}`;
  if (jobType) {
    base += `/type/${jobType}`;
  }
  const fragment = args.join('/');
  return args.length ? `${base}/${fragment}` : base;
}

function normalizeQueueName({ host, queue, name }: StreamNameOptions) {
  let _name = name;
  if (!name && queue) {
    _name = queue.name;
  }
  let _host = host;
  if (!host && typeof queue === 'object') {
    _host = queue.host;
  }

  return { host: _host, queue, name: _name };
}

export class QueueService {
  private readonly _request;
  private readonly _sockets;

  constructor(request) {
    this._request = request;
  }

  /**
   * Fetch a queue by host and name
   * @param {string} host the queue host
   * @param {string} name the queue name
   */
  async get(host: string, name: string) {
    const queue = await this._request.get(getUrl(host, name));
    if (queue) {
      queue.host = host;
    }
    return queue;
  }

  /**
   * Get all queues for a given host
   * @param {string} host the queue host
   */
  async getHostQueues(host: string) {
    return this._request
      .get(`queues/${encodeURIComponent(host)}`)
      .then((response) => {
        const hostName = response.name || response.host || host;
        const queues = response.queues || response;
        queues.forEach((queue) => {
          queue.host = hostName;
          queue.isActive = !queue.isPaused;
        });
        return queues;
      });
  }

  async getAll(): Promise<any[]> {
    const response = await this._request.get('queues');
    const hosts = Object.keys(response);
    hosts.forEach((host) => {
      const queues = response[host];
      queues.forEach((queue) => {
        queue.host = host;
      });
    });
    return response;
  }

  /**
   * Pause a queue
   * @param {string} host queue host
   * @param {string} name queue name
   */
  async pause(host: string, name: string): Promise<boolean> {
    const { isPaused } = await this._request.post(getUrl(host, name, 'pause'));
    return isPaused;
  }

  /**
   * Resume a queue
   * @param {string} host queue host
   * @param {string} name queue name
   */
  async resume(host: string, name: string): Promise<boolean> {
    const { isPaused } = await this._request.post(getUrl(host, name, 'resume'));
    return isPaused;
  }

  /*@function clean
   *
   * Cleans getJobs from a queue. Similar to remove but keeps getJobs within a certain
   * grace period.
   * @param {string} host - the queue host
   * @param {string} name - queue name
   * @param {CleanOptions} options clean options
   * @param {number} options.grace - The grace period
   * @param {number} options.limit The max number of getJobs to clean
   * @param {string} options.stats The type of job to clean
   * Possible values are completed, wait, active, paused, delayed, failed. Defaults to completed.
   * @returns {Promise<string[]>} the ids of the removed getJobs
   */
  clean(
    host: string,
    name: string,
    options: CleanOptions = {
      status: 'completed',
      limit: 1000,
      grace: 5000,
    },
  ): Promise<string[]> {
    const path = getUrl(host, name, 'clean');
    return this._request.post(path, options);
  }

  /**
   * Retry all failed getJobs
   * @param host the queue host
   * @param name queue name
   */
  retryFailed(host: string, name: string) {
    const path = getUrl(host, name, 'retry-all');
    return this._request.post(path);
  }

  subscribe(opts: StreamNameOptions, handlers?: EventHandlerMap) {
    if (!isObject(opts)) {
      throw new TypeError(
        'Invalid options specified for `subscribe`. Should be a stream name or a hash of options',
      );
    }
    const streamName = this.getStreamName(opts);
    return this._sockets.subscribe(streamName, handlers);
  }

  getStreamName(opts: StreamNameOptions): string {
    let streamName = opts.streamName;
    const { jobType, type, granularity } = opts;
    const { host, name } = normalizeQueueName(opts);

    if (!streamName) {
      if (!host || !name) {
        return null;
      }
      const args = [];
      if (type) {
        let tag = type;
        if (granularity) {
          const suffix = `1${granularity.charAt(0).toLowerCase()}`;
          tag = `${tag}:${suffix}`;
        }
        args.push(tag);
      }

      streamName = constructStreamName(host, name, jobType, ...args);
    }
    return streamName;
  }
}
