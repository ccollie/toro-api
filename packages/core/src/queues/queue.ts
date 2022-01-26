import { isEmpty, uniq } from '@alpen/shared';
import { Job, JobState, JobType, Queue, RedisClient } from 'bullmq';
import { getQueueConfig } from '../hosts/host-config';
import { deleteByPattern, normalizePrefixGlob, scanKeys } from '../redis';
import { systemClock } from '../lib';
import { getQueueMetaKey, getQueueStatsPattern } from '../keys';
import {
  getJobNamesWithSchemas,
  getJobSchemas,
  validateBySchema,
  validateJobData,
} from './job-schemas';
import { JobCreationOptions, JobStatus } from '../types/queues';
import { Pipeline } from 'ioredis';
import { logger } from '../logger';
import { Scripts } from '../commands';
import { StatsGranularity } from '../stats';
import { JobMemoryLoaderKey, JobMemoryLoaderResult, loaders } from '../loaders';

export const JOB_STATES: JobState[] = [
  'completed',
  'failed',
  'delayed',
  'active',
  'waiting',
  'waiting-children',
];

/****
 * A more performant way to fetch multiple getJobs from a queue.
 * The standard method in Bull makes a round trip per job. This
 * method uses pipelining to get all getJobs in a single roundtrip
 * @param {Queue} queue a Bull queue
 * @param {string[]} ids job ids
 * @returns {Promise<[Job]>}
 */
export async function getMultipleJobsById(
  queue: Queue,
  ...ids: (string | string[])[]
): Promise<Job[]> {
  const flat = [].concat(...ids);
  const client = await queue.client;
  const multi = client.multi();
  flat.forEach((jid) => {
    multi.hgetall(queue.toKey(jid));
  });
  const res = await multi.exec();
  const result: Job<any, any>[] = [];
  const now = systemClock.getTime();
  res.forEach((item, index) => {
    if (item[0]) {
      // err
    } else {
      const jobData = item[1];
      const jid = flat[index];
      if (!isEmpty(jobData)) {
        const job = Job.fromJSON(queue, jobData, jid);
        job.timestamp = parseInt(jobData.timestamp || now);
        result.push(job);
      }
    }
  });
  return result;
}

export async function getJobCounts(
  queue: Queue,
  states?: JobType[],
): Promise<Record<string, number>> {
  states = (!states || states.length) === 0 ? JOB_STATES : states;
  let result = await queue.getJobCounts(...states);
  if (!result) result = {};
  JOB_STATES.forEach((state) => {
    if (typeof result[state] !== 'number') {
      result[state] = 0;
    }
  });
  return result;
}

export async function getQueueMeta(queue: Queue): Promise<Record<string, any>> {
  const key = getQueueMetaKey(queue);
  const client = await queue.client;
  return client.hgetall(key);
}

export async function setQueueMeta(
  queue: Queue,
  meta: Record<string, any>,
): Promise<void> {
  const client = await queue.client;
  await client.hmset(getQueueMetaKey(queue), meta || {});
}

export interface DiscoveredQueue {
  prefix: string;
  name: string;
}

export async function discoverQueues(
  client: RedisClient,
  prefix?: string,
): Promise<DiscoveredQueue[]> {
  const pattern = normalizePrefixGlob(prefix);

  const options = {
    match: pattern,
    count: 1000,
  };
  const result = [];

  logger.info('running queue discovery', { pattern });

  await scanKeys(client, options, (keys) => {
    const current = keys.map((key) => {
      const parts = key.split(':');
      return {
        prefix: parts.slice(0, -2).join(':'),
        name: parts[parts.length - 2],
      };
    });
    result.push(...current);
  });

  return result;
}

export async function discoverJobNames(
  queue: Queue,
  expiration?: number,
): Promise<string[]> {
  // Note: we also return names for which we have defined
  // schemas, even if no jobs of the type have been created
  const [fromQueue, fromSchema] = await Promise.all([
    Scripts.getJobNames(queue, expiration),
    getJobNamesWithSchemas(queue),
  ]);
  const uniq = new Set([...fromQueue, ...fromSchema]);
  return Array.from(uniq);
}

export async function getJobTypes(
  hostName: string,
  queue: Queue,
  expiration?: number,
): Promise<string[]> {
  const config = getQueueConfig(hostName, queue.name);
  if (config && config.jobTypes && config.jobTypes.length) {
    return config.jobTypes;
  } else {
    return discoverJobNames(queue, expiration);
  }
}

export async function createJob(
  queue: Queue,
  job: JobCreationOptions,
): Promise<Job> {
  const { name, data, opts } = job;
  const { options, data: validated } = await validateJobData(
    queue,
    name,
    data,
    opts,
  );

  return queue.add(name, validated, options);
}

export async function validateJobs(
  queue: Queue,
  jobs: JobCreationOptions[],
): Promise<void> {
  const names = jobs.map(({ name }) => name);
  if (!names.length) return;
  const schemas = await getJobSchemas(queue, uniq(names));
  if (isEmpty(schemas)) {
    return;
  }

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const schema = schemas[job.name];
    if (schema) {
      const { data, options } = validateBySchema(
        job.name,
        schema,
        job.data,
        job.opts,
      );
      job.data = data;
      job.opts = options;
    }
  }
}

export async function createBulkJobs(
  queue: Queue,
  jobs: JobCreationOptions[],
): Promise<Job[]> {
  await validateJobs(queue, jobs);
  return queue.addBulk(jobs);
}

export async function deleteQueueStats(
  queue: Queue,
  jobName: string = null,
  granularity?: StatsGranularity,
): Promise<number> {
  const client = await queue.client;
  const pattern = getQueueStatsPattern(queue, jobName, granularity);
  return deleteByPattern(client, pattern);
}

export async function deleteAllQueueData(queue: Queue): Promise<number> {
  const prefix = queue.opts.prefix;
  const pattern = `${prefix}:${queue.name}:*`;
  const client = await queue.client;
  // todo: need to delete data at the host level
  return deleteByPattern(client, pattern);
}

export function getPipelinedCounts(
  pipeline: Pipeline,
  queue: Queue,
  types: string[],
): Pipeline {
  types.forEach((type: string) => {
    type = type === 'waiting' ? 'wait' : type; // alias

    const key = queue.toKey(type);
    switch (type) {
      case 'completed':
      case 'failed':
      case 'delayed':
      case 'repeat':
      case 'waiting-children':
        pipeline.zcard(key);
        break;
      case 'active':
      case 'wait':
      case 'paused':
        pipeline.llen(key);
        break;
    }
  });

  return pipeline;
}

export async function getPipelinePaused(
  client: RedisClient,
  queues: Queue[],
): Promise<boolean[]> {
  const pipeline = client.pipeline();
  queues.forEach((queue) => {
    pipeline.hexists(queue.keys.meta, 'paused');
  });
  const res = await pipeline.exec();
  const result: boolean[] = [];

  res.forEach((item, index) => {
    if (item[0]) {
      // error. Todo: throw
      result.push(false);
    } else {
      result.push(item[1] === 1);
    }
  });

  return result;
}

export async function getJobCountByType(
  queue: Queue,
  ...states: JobState[]
): Promise<number> {
  const key = {
    queue,
    types: states,
  };
  const counts = await loaders.jobCounts.load(key);
  return Object.values(counts).reduce(
    (sum: number, count: number) => sum + count,
    0,
  );
}

export async function getJobMemoryUsage(
  queue: Queue,
  state: JobStatus,
  limit?: number,
  jobName?: string,
): Promise<JobMemoryLoaderResult> {
  const key: JobMemoryLoaderKey = {
    queue,
    state,
    limit,
    jobName,
  };
  return loaders.jobMemoryUsage.load(key);
}

export async function getJobMemoryAvg(
  queue: Queue,
  state: JobStatus,
  limit?: number,
  jobName?: string,
): Promise<number> {
  const { byteCount, jobCount } = await getJobMemoryUsage(
    queue,
    state,
    limit,
    jobName,
  );
  return byteCount / (jobCount || 1);
}
