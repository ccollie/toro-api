import ms from 'ms';
import { loadScripts } from './index';
import { Job, JobJsonRaw, Queue, RedisClient } from 'bullmq';
import isEmpty from 'lodash/isEmpty';
import { JobFinishedState, JobStatusEnum } from '../../types';
import { nanoid } from '../lib';
import { Pipeline } from 'ioredis';
import { getConfigDuration } from '@lib/config-utils';

const DEFAULT_JOBNAMES_TIMEOUT = getConfigDuration(
  'JOB_NAMES_CACHE_TIMOUT',
  ms('15 secs'),
);

export interface ScriptFilteredJobsResult {
  cursor: number;
  total: number;
  count: number;
  jobs: Job[];
}

function parseScriptError(err: string): string {
  const errorRegex = /@user_script\:[0-9]+\:\s+user_script\:[0-9]+\:\s*(.*)/g;
  const matches = err.match(errorRegex);
  // TODO
  return err;
}

const DEFAULT_SAMPLE_SIZE = 50;
const MAX_SAMPLE_SIZE = 1000;

export class Scripts {
  private static getStateKeys(queue: Queue): string[] {
    return [
      'completed',
      'failed',
      'delayed',
      'active',
      'wait',
      'paused',
      'waiting-children',
    ].map(function (key: string) {
      return queue.toKey(key);
    });
  }

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
    const keys = Scripts.getStateKeys(queue);
    const args = [...keys, id];
    return (client as any).getJobState(...args);
  }

  static async multiGetJobState(
    queue: Queue,
    ids: string[],
  ): Promise<string[]> {
    const client = await queue.client;
    const multi = client.multi();
    const keys = Scripts.getStateKeys(queue);
    ids.forEach((id) => {
      const args = [...keys, id];
      (multi as any).getJobState(...args);
    });

    return parseListPipeline<string>(multi);
  }

  static getIsInListsArgs(
    queue: Queue,
    id: string,
    ...keys: string[]
  ): [number, string[], string] {
    return [keys.length, keys.map(queue.toKey), id];
  }

  static async isInLists(queue: Queue, id: string, ...states: string[]) {
    const client = await queue.client;
    const args = Scripts.getIsInListsArgs(queue, id, ...states);
    return (client as any).idInLists(...args);
  }

  static getJobNamesArgs(
    queue: Queue,
    expiration: number = DEFAULT_JOBNAMES_TIMEOUT,
  ): Array<number | string> {
    const destKey = queue.toKey('jobTypes');
    const scratchKey = queue.toKey(`scratch:${nanoid()}`);
    const keyPrefix = queue.toKey('');

    return [
      ...Scripts.getStateKeys(queue),
      scratchKey,
      destKey,
      keyPrefix,
      expiration,
    ];
  }

  static async getJobNames(
    queue: Queue,
    expiration?: number,
  ): Promise<string[]> {
    const client = await queue.client;
    const args = Scripts.getJobNamesArgs(queue, expiration);
    return (client as any).getJobNames(...args);
  }

  static getKeysMemoryUsageArgs(
    queue: Queue,
    status: JobStatusEnum,
    limit: number = DEFAULT_SAMPLE_SIZE,
    jobName: string = null,
  ): Array<string | number> {
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    const args = [key, prefix, Math.max(limit, MAX_SAMPLE_SIZE)];
    if (jobName && jobName.length) {
      args.push(jobName);
    }
    return args;
  }

  private static getAvgJobMemoryArgs(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState,
    limit: number,
  ) {
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    return [key, prefix, jobName, Math.max(limit, MAX_SAMPLE_SIZE)];
  }

  static async getAvgJobMemoryUsage(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState = JobStatusEnum.COMPLETED,
    limit = 100,
  ): Promise<number> {
    const client = await queue.client;
    const args = Scripts.getAvgJobMemoryArgs(queue, jobName, status, limit);
    return (client as any).getAvgJobMemoryUsage(...args);
  }

  static async multiGetAvgJobMemoryUsage(
    client: RedisClient,
    queues: Queue[],
    jobName: string = null,
    status: JobFinishedState = JobStatusEnum.COMPLETED,
    limit = 100,
  ): Promise<number[]> {
    const pipeline = client.pipeline();
    queues.forEach((queue) => {
      const args = Scripts.getAvgJobMemoryArgs(queue, jobName, status, limit);
      (pipeline as any).getAvgJobMemoryUsage(...args);
    });

    return parseNumberListPipeline(pipeline);
  }

  static async getAvgJobDuration(
    queue: Queue,
    jobName: string = null,
    status: JobFinishedState,
    limit = 100,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    const args = [key, prefix, jobName, Math.max(limit, MAX_SAMPLE_SIZE)];
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
    const args = [key, prefix, jobName, Math.max(limit, MAX_SAMPLE_SIZE)];
    return (client as any).getWaitTimeAverage(...args);
  }

  static async getInQueueAvgWaitTime(
    queue: Queue,
    jobName: string = null,
    limit = 1000,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.keys.waiting;
    const args = [key, prefix, Date.now().toString(), jobName, limit];
    return (client as any).getInQueueWaitTimeAverage(...args);
  }

  static async getJobsByFilter(
    queue: Queue,
    type: string,
    filter: any,
    cursor: number,
    count = 10,
  ): Promise<ScriptFilteredJobsResult> {
    const client = await loadScripts(await queue.client);
    type = type === 'waiting' ? 'wait' : type; // alias
    const key = type ? queue.toKey(type) : '';
    const prefix = queue.toKey('');
    const criteria = JSON.stringify(filter);

    const response = await (client as any).filterJobs(
      key,
      prefix,
      criteria,
      cursor,
      count,
    );

    const newCursor = response[0] === '0' ? null : Number(response[0]);
    const jobs: Job[] = [];

    let currentJob: Record<string, any> = {};
    let jobId: string = null;
    const iterCount = Number(response[1]);
    const totalCount = Number(response[2]);

    function addJobIfNeeded() {
      if (!isEmpty(currentJob) && jobId) {
        // TODO: verify this
        const trace = currentJob['stacktrace'];
        if (!Array.isArray(trace)) {
          if (typeof trace === 'string') {
            currentJob['stacktrace'] = JSON.parse(trace);
          } else {
            currentJob['stacktrace'] = [];
          }
        }
        const raw = currentJob as JobJsonRaw;
        const job = Job.fromJSON(queue, raw, jobId);
        const ts = currentJob['timestamp'];
        job.timestamp = ts ? parseInt(ts) : Date.now();
        jobs.push(job);
      }
    }

    for (let i = 3; i < response.length; i += 2) {
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
      cursor: newCursor,
      total: totalCount,
      count: iterCount,
      jobs,
    };
  }
}

async function parseListPipeline<T = any>(pipeline: Pipeline) {
  const res = await pipeline.exec();
  const result = new Array<T>(res.length);

  res.forEach((item, index) => {
    if (item[0]) {
      // err
      result[index] = null;
    } else {
      result[index] = item[1] as T;
    }
  });

  return result;
}

async function parseNumberListPipeline(pipeline: Pipeline): Promise<number[]> {
  const result = await parseListPipeline<number>(pipeline);
  return result.map((x) => x ?? 0);
}
