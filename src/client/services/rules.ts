import { downloadJson } from '../common/downloads';
import { safeParse } from '../common/utils';
import Request from './request';

export interface AlertJson {
  _id: string | undefined;
  ruleId?: string;
  start: number;
  end?: number;
  payload?: object;
  state?: object;
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

function ruleUrl(host: string, name: string, id: string, ...args) {
  return getUrl(host, name, 'rules', id, ...args);
}

/**
 * Generate a stream name for realtime job updates
 * @param {string} host the queue host
 * @param {string | object} queue the queue
 * @param {String} ruleId the rule id
 */
function getRuleStreamName(host: string, queue, ruleId: string) {
  const name = queue && queue.name ? queue.name : queue;
  return `rules://${host}/${name}/${ruleId}`;
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

function normalizeJob(job) {
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

export class RuleService {
  constructor(private http: Request) {}

  /**
   * Fetch a Rule
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string} id the rule id
   * @returns {Promise<Rule>}
   */
  async getRule(
    host: string,
    queue: string,
    id: string,
  ): Promise<Record<string, any>> {
    return this.http.get(ruleUrl(host, queue, id));
  }

  /**
   * Retrieve the alerts for a rule
   * @param {string} host
   * @param {string} queue
   * @param {string} id rule id
   * @param {number} start
   * @param {number} end
   * @returns {Promise<AlertJson[]>}
   */
  getRuleAlerts(host: string, queue: string, id: string, start, end) {
    const queryParams = {
      start,
      end,
    };
    return this.http.get(ruleUrl(host, queue, id, 'alerts'), queryParams);
  }

  /**
   * Fetch rules
   * @param {string} host the queue host
   * @param {string} name queue name
   * @param {number} offset start offset
   * @param {number} limit the maximum number of records to return
   * @param {boolean} asc sort ascending
   */
  async getRules(host: string, name: string, offset = 0, limit = 25, asc) {
    const data = { offset, limit, asc };
    const response = await this.http.get(getUrl(host, name, 'rules'), data);

    if (response && Array.isArray(response.jobs)) {
      response.jobs = response.jobs.map(normalizeJob);
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
   * Fetch a Rule and trigger a browser download
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string} id the rule id
   */
  async downloadRule(host: string, queue, id: string) {
    const rule = await this.getRule(host, queue, id);
    // todo: set target to _blank
    const filename = `${queue}-${rule.name}-${rule.id}-dump.json`;
    return downloadJson(rule, filename);
  }

  /**
   * Delete a Rule
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string} id the rule id
   */
  deleteRule(host: string, queue: string, id: string) {
    return this.http.del(ruleUrl(host, queue, id));
  }

  /**
   * Change a Rule to "active" stats
   * @param {string} host  queue host
   * @param {string | object} queue queue name or instance
   * @param {string} id the rule id
   * @returns {Promise<boolean>}
   */
  activateRule(host: string, queue, id: string) {
    return this.http.post(ruleUrl(host, queue, id, 'activate'));
  }

  /**
   * Change a Rule to "inactive" stats
   * @param {string} host  queue host
   * @param {string | object} queue queue name or instance
   * @param {string} id the rule id
   * @returns {Promise<boolean>}
   */
  deactivateRule(host: string, queue, id: string) {
    return this.http.post(ruleUrl(host, queue, id, 'deactivate'));
  }

  /**
   * Get an alert
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string} ruleId the rule id
   * @param {string} alertId the alert id
   * @returns {Promise<AlertJson>}
   */
  getAlert(host: string, queue: string, ruleId: string, alertId: string) {
    return this.http.get(ruleUrl(host, queue, ruleId, alertId));
  }

  /**
   * Delete a Rule
   * @param {string} host  queue host
   * @param {string} queue queue name
   * @param {string} ruleId the rule id
   * @param {string} alertId the rule id
   */
  deleteAlert(host: string, queue: string, ruleId: string, alertId: string) {
    return this.http.del(ruleUrl(host, queue, ruleId, alertId));
  }
}
