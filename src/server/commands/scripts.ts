import { loadScripts } from './index';
import { Job, Queue } from 'bullmq';
import isEmpty from 'lodash/isEmpty';
import nanoid from 'nanoid';
import { JobFinishedState, JobStatusEnum } from '../../types';

export interface FilteredJobsResult {
  nextCursor: number;
  jobs: Job[];
}

export class Scripts {
  /**
   * Get the job states
   * @param {String} queue Queue names
   * @param {String} id job Id
   * @param client
   * @returns {Promise<string>} A promise that resolves to the job states or "unknown"
   */
  static async getJobState(
    queue: Queue,
    id: string,
    client = null,
  ): Promise<string> {
    client = client || (await queue.client);
    const queueKeys = queue.keys;

    const args = [
      queueKeys.completed,
      queueKeys.failed,
      queueKeys.delayed,
      queueKeys.active,
      queueKeys.waiting,
      queueKeys.paused,
      id,
    ];

    return (client as any).getJobState(...args);
  }

  static async multiGetJobState(
    queue: Queue,
    ids: string[],
  ): Promise<string[]> {
    const client = await queue.client;
    const queueKeys = queue.keys;
    const multi = client.multi();

    ids.forEach((id) => {
      const args = [
        queueKeys.completed,
        queueKeys.failed,
        queueKeys.delayed,
        queueKeys.active,
        queueKeys.waiting,
        queueKeys.paused,
        id,
      ];
      (multi as any).getJobState(...args);
    });

    const res = await multi.exec();
    const result = new Array<string>(ids.length);

    res.forEach((item, index) => {
      if (item[0]) {
        // err
        result[index] = null;
      } else {
        result[index] = item[1];
      }
    });

    return result;
  }

  static async getJobNames(
    queue: Queue,
    expiration: number,
  ): Promise<string[]> {
    const client = await queue.client;
    const destKey = queue.toKey('jobTypes');

    const scratchKey = queue.toKey(`scratch:${nanoid(10)}`);
    const keyPrefix = queue.toKey('');
    const queueKeys = queue.keys;

    const keys = [
      queueKeys.completed,
      queueKeys.failed,
      queueKeys.delayed,
      queueKeys.active,
      queueKeys.waiting,
      queueKeys.paused,
      scratchKey,
      destKey,
    ];
    const args = [...keys, keyPrefix, expiration];
    return (client as any).getJobNames(...args);
  }

  static async getAvgJobMemoryUsage(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState = JobStatusEnum.COMPLETED,
    limit = 1000,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    const args = [key, prefix, jobName, limit];
    return (client as any).getAvgJobMemoryUsage(...args);
  }

  static async getAvgJobDuration(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState,
    limit = 1000,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    const args = [key, prefix, jobName, limit];
    return (client as any).getDurationAverage(...args);
  }

  static async getAvgWaitTime(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState,
    limit = 1000,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    const args = [key, prefix, jobName, limit];
    return (client as any).getWaitTimeAverage(...args);
  }

  static async getJobsByFilter(
    queue: Queue,
    type: string,
    filter: Record<string, any>,
    cursor: number,
    count = 100,
  ): Promise<FilteredJobsResult> {
    const client = await loadScripts(await queue.client);
    type = type === 'waiting' ? 'wait' : type; // alias
    const key = type ? queue.toKey(type) : '';
    const prefix = queue.toKey('');
    // todo: substitutions
    // $$NOW -> Date.now()
    const criteria = JSON.stringify(filter);

    // @ts-ignore
    const response = await client.getJobsByFilter(
      key,
      prefix,
      criteria,
      cursor,
      count,
    );

    const newCursor = response[0] === '0' ? null : Number(response[0]);
    const jobs: Job[] = [];

    let currentJob: Record<string, string> = {};
    let jobId: string = null;

    function addJobIfNeeded() {
      if (!isEmpty(currentJob) && jobId) {
        const job = Job.fromJSON(queue, currentJob, jobId);
        const ts = currentJob['timestamp'];
        job.timestamp = ts ? parseInt(ts) : Date.now();
        jobs.push(job);
      }
    }

    for (let i = 1; i < response.length; i += 2) {
      const key = response[i];
      const value = response[i + 1];

      if (key === 'jobId') {
        addJobIfNeeded();
        jobId = value;
        currentJob = {};
      } else {
        currentJob[key] = value;
      }
    }

    addJobIfNeeded();

    return {
      nextCursor: newCursor,
      jobs,
    };
  }
}