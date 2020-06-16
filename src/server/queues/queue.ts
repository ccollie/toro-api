import ms from 'ms';
import nanoid from 'nanoid';
import { isEmpty, uniq } from 'lodash';
import { Queue, Job } from 'bullmq';
import { getQueueConfig } from '../config/host-config';
import { deleteByPattern } from '../redis/utils';
import { systemClock } from '../lib/clock';
import { getJobSchemas, validateBySchema, validateJobData } from './jobSchemas';
import { JobCreationOptions, JobStatusEnum } from '../../types';

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
  const result = [];
  const now = systemClock.now();
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
  const key = queue.keys.meta;
  const client = await queue.client;
  return client.hgetall(key);
}

export async function setQueueMeta(queue: Queue, meta: any): Promise<void> {
  const client = await queue.client;
  await client.hmset(queue.keys.meta, meta || {});
}

export async function queueIsPaused(queue: Queue): Promise<boolean> {
  const meta = await getQueueMeta(queue);
  const { paused = false } = meta || {};
  return !!(paused && parseInt(paused));
}

export async function discoverJobNames(
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

export async function getJobTypes(
  hostName: string,
  queue: Queue,
  expiration?: number,
): Promise<string[]> {
  const config = getQueueConfig(hostName, queue.name);
  if (config && config.jobTypes && config.jobTypes.length) {
    return config.jobTypes;
  } else {
    expiration = expiration || ms('5 sec');
    return discoverJobNames(queue, expiration);
  }
}

export async function removeAllQueueData(
  client,
  queueName: string,
  prefix = 'bull',
): Promise<number> {
  const pattern = `${prefix}:${queueName}:*`;
  return deleteByPattern(client, pattern);
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
