import ms from 'ms';
import { Job, JobJsonRaw, MinimalQueue, Queue, RedisClient } from 'bullmq';
import { isEmpty } from '@alpen/shared';
import { pack } from 'msgpackr';
import { MetricsTimeseries } from '../metrics/metrics-timeseries';
import { translateReplyError } from '../redis';
import { JobFinishedState, JobStatus } from '../types';
import { nanoid } from '../lib';
import { Pipeline } from 'ioredis';
import { getConfigDuration } from '../lib/config-utils';
import { ensureScriptsLoaded } from './utils';

const DEFAULT_JOBNAMES_TIMEOUT = getConfigDuration(
  'JOB_NAMES_CACHE_TIMOUT',
  ms('15 secs'),
);

export type FilterJobAction = 'getJobs' | 'getIds' | 'remove';

export interface ScriptFilteredJobsResult {
  cursor?: number;
  total: number;
  jobs?: Job[];
  ids?: string[];
  removed?: number;
}

export interface ScanJobsResult {
  cursor?: number;
  total: number;
  jobs: Partial<Job>[];
}

const DEFAULT_SAMPLE_SIZE = 50;
const MAX_SAMPLE_SIZE = 1000;

function handleReplyError(e: unknown, client?: RedisClient): void {
  if (e instanceof Error) {
    throw translateReplyError(e, client);
  }
  throw e;
}

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
    client?: RedisClient,
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

  static async isInLists(
    queue: Queue,
    id: string,
    ...states: string[]
  ): Promise<boolean> {
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
    status: JobStatus,
    limit: number = DEFAULT_SAMPLE_SIZE,
    jobName = '',
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
    jobName = '',
    status: JobFinishedState,
    limit: number,
  ) {
    const prefix = queue.toKey('');
    const key = queue.toKey(status);
    return [key, prefix, jobName, Math.max(limit, MAX_SAMPLE_SIZE)];
  }

  static async getAvgJobMemoryUsage(
    queue: Queue,
    jobName = '',
    status: JobFinishedState = 'completed',
    limit = 100,
  ): Promise<number> {
    const client = await queue.client;
    const args = Scripts.getAvgJobMemoryArgs(queue, jobName, status, limit);
    return (client as any).getAvgJobMemoryUsage(...args);
  }

  static async multiGetAvgJobMemoryUsage(
    client: RedisClient,
    queues: Queue[],
    jobName = '',
    status: JobFinishedState = 'completed',
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
    jobName = '',
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
    jobName: string | null = null,
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
    jobName: string | null = null,
    limit = 1000,
  ): Promise<number> {
    const client = await queue.client;
    const prefix = queue.toKey('');
    const key = queue.keys.waiting;
    const args = [key, prefix, Date.now().toString(), jobName, limit];
    return (client as any).getInQueueWaitTimeAverage(...args);
  }

  static async execJobFilterAction(
    queue: Queue,
    type: string,
    filter: any,
    action: FilterJobAction,
    globals: Record<string, any> | undefined | null,
    cursor: number,
    count = 10,
  ): Promise<ScriptFilteredJobsResult> {
    const client = await queue.client;
    if (!(client as any).jobFilter) {
      await ensureScriptsLoaded(client);
    }
    type = type === 'waiting' ? 'wait' : type; // alias
    const key = type ? queue.toKey(type) : '';

    let response: any;
    try {
      const opts = pack({
        action,
        criteria: filter,
        globals: globals ?? null,
        cursor,
        count,
      });
      response = await (client as any).jobFilter(key, opts);
    } catch (e: unknown) {
      handleReplyError(e, client);
    }

    const unpacked = JSON.parse(response) as Record<string, any>;

    const totalCount = Number(unpacked.total);

    const result: ScriptFilteredJobsResult = {
      total: totalCount,
    };

    const newCursor = parseInt(unpacked['cursor'], 10);
    if (!Number.isNaN(newCursor)) {
      result.cursor = newCursor;
    }

    if (typeof unpacked.jobs !== undefined) {
      const jobs: Job[] = [];
      if (Array.isArray(unpacked.jobs)) {
        unpacked.jobs.forEach((currentJob) => {
          const job = fixupJob(queue, currentJob);
          job && jobs.push(job);
        });
      }
      result.jobs = jobs;
    }

    if (typeof unpacked.ids !== undefined) {
      if (Array.isArray(unpacked.ids)) {
        result.ids = [...unpacked.ids];
      } else {
        result.ids = [];
      }
    }

    return result;
  }

  static async getJobsByFilter(
    queue: Queue,
    type: string,
    filter: any,
    globals: Record<string, any> | undefined | null,
    cursor: number,
    count = 10,
  ): Promise<ScriptFilteredJobsResult> {
    return Scripts.execJobFilterAction(
      queue,
      type,
      filter,
      'getJobs',
      globals,
      cursor,
      count,
    );
  }

  static async getJobIdsByFilter(
    queue: Queue,
    type: string,
    filter: any,
    globals: Record<string, any> | undefined | null,
    cursor: number,
    count = 10,
  ): Promise<ScriptFilteredJobsResult> {
    return Scripts.execJobFilterAction(
      queue,
      type,
      filter,
      'getIds',
      globals,
      cursor,
      count,
    );
  }

  static async removeJobsByFilter(
    queue: Queue,
    type: string,
    filter: any,
    globals: Record<string, any> | undefined | null,
    cursor: number,
    count = 10,
  ): Promise<ScriptFilteredJobsResult> {
    return Scripts.execJobFilterAction(
      queue,
      type,
      filter,
      'remove',
      globals,
      cursor,
      count,
    );
  }

  static async scanJobs(
    queue: Queue,
    status: JobStatus,
    jobName: string,
    fields: string[] | undefined | null,
    cursor: number,
    count = 20,
  ): Promise<ScanJobsResult> {
    const client = await queue.client;
    if (!(client as any).jobFilter) {
      await ensureScriptsLoaded(client);
    }
    const type = status === 'waiting' ? 'wait' : status; // alias
    const key = queue.toKey(type);

    let response: any;
    try {
      const opts = pack({
        fields: fields ?? null,
        jobName,
        cursor,
        count,
      });
      response = await (client as any).scanJobs(key, opts);
    } catch (e: unknown) {
      handleReplyError(e, client);
    }

    const unpacked = JSON.parse(response) as Record<string, any>;

    const totalCount = Number(unpacked.total);

    const result: ScanJobsResult = {
      total: totalCount,
      jobs: [],
    };

    const newCursor = parseInt(unpacked['cursor'], 10);
    if (!Number.isNaN(newCursor)) {
      result.cursor = newCursor;
    }

    if (typeof unpacked.jobs !== undefined) {
      const jobs: Job[] = [];
      if (Array.isArray(unpacked.jobs)) {
        unpacked.jobs.forEach((currentJob) => {
          const job = fixupJob(queue, currentJob);
          job && jobs.push(job);
        });
      }
      result.jobs = jobs;
    }

    return result;
  }

  static async getMetricsDateRange(
    queue: MinimalQueue,
    type: 'failed' | 'completed',
    start: Date | number = 0,
    end: Date| number = -1,
  ): Promise<MetricsTimeseries> {
    const client = await queue.client;

    if (typeof start !== 'number') {
      start = start.getDate();
    }
    if (typeof end !== 'number') {
      end = end.getDate();
    }
    if (end !== -1 && end < start) {
      throw new Error('End date must be greater than start date');
    }

    const metricsKey = queue.toKey(`metrics:${type}`);
    const dataKey = `${metricsKey}:data`;

    const args = [
      metricsKey,
      dataKey,
      start,
      end,
    ];

    const arr = await (<any>client).getMetricsDateRange(args);
    const res = arr as Array<string>;
    const [startDate, endDate, count] = res.slice(-3);
    const dataPoints = res.slice(0, -3);
    const startTs = parseInt(startDate, 10);
    const data = dataPoints.map((v, i) => ({
      ts: startTs + (i * 60000),
      value: parseInt(v, 10),
    }));

    return {
      meta: {
        startTs,
        endTs: parseInt(endDate, 10),
        count: parseInt(count, 10),
      },
      data,
    };
  }
}

async function parseListPipeline<T = any>(pipeline: Pipeline) {
  const res = await pipeline.exec();
  const result = new Array<T | null>(res.length);

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

export function fixupJob(queue: Queue, currentJob: any): Job {
  if (!isEmpty(currentJob)) {
    // TODO: verify this
    const trace = currentJob['stacktrace'];
    if (!Array.isArray(trace)) {
      if (typeof trace === 'string') {
        currentJob['stacktrace'] = JSON.parse(trace);
      } else {
        currentJob['stacktrace'] = [];
      }
    }
    // logs ???
    const jobId = currentJob.id;
    const raw = currentJob as JobJsonRaw;
    const job = Job.fromJSON(queue, raw, jobId);
    const ts = currentJob['timestamp'];
    job.timestamp = ts ? parseInt(ts) : Date.now();
    return job;
  }
  return null;
}
