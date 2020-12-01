import ms from 'ms';
import { isEmpty, uniq } from 'lodash';
import { Job, Queue } from 'bullmq';
import { getQueueConfig } from '../hosts';
import { deleteByPattern, normalizePrefixGlob, scanKeys } from '../redis';
import { getQueueMetaKey, getQueueStatsPattern, systemClock } from '../lib';
import {
  getJobNamesWithSchemas,
  getJobSchemas,
  validateBySchema,
  validateJobData,
} from './job-schemas';
import {
  DiscoveredQueue,
  JobCreationOptions,
  JobStatusEnum,
  StatsGranularity,
} from '../../types';
import IORedis from 'ioredis';
import logger from '../lib/logger';
import { Scripts } from '../commands/scripts';

const JOB_STATES = Object.values(JobStatusEnum);

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
  const result: Job<any, any>[] | PromiseLike<Job<any, any>[]> = [];
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
  states?: string[],
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

export async function getExists(queue: Queue): Promise<Record<string, any>> {
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

export async function discoverQueues(
  client: IORedis.Redis,
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
  expiration: number,
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
    const expires = expiration || ms('5 sec');
    return discoverJobNames(queue, expires);
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
