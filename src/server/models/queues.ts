import ms from 'ms';
import nanoid from 'nanoid';
import { isEmpty } from 'lodash';
import { Queue, Job } from 'bullmq';
import { getQueueConfig } from '../config/host-config';
import { deleteByPattern } from '../redis/utils';
import { systemClock } from '../lib/clock';

const JOB_STATES = ['active', 'waiting', 'completed', 'delayed', 'failed'];

function normalizeStates(...states) {
  if (!states.length) {
    states = JOB_STATES;
  } else {
    states = [].concat(...states);
  }
  states = states.filter((x) => !!x);
  if (!states.length) {
    states = JOB_STATES;
  }
  return states;
}

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

/**
 * Fetch a number of getJobs of certain type
 * @param {Queue} queue
 * @param {String|String[]} states Job types: {waiting|active|delayed|completed|failed}
 * @param {Number} offset Index offset (optional)
 * @param {Number} limit Limit of the number of getJobs returned (optional)
 * @param asc {Boolean} asc/desc
 * @returns {Promise} A promise that resolves to an array of getJobs
 */
export async function getJobs(
  queue: Queue,
  states,
  offset = 0,
  limit = 30,
  asc: boolean,
) {
  const order = {
    waiting: true,
    active: false,
    delayed: true,
    completed: false,
    failed: false,
  };

  if (typeof states === 'string') {
    states = states.split(',');
  }

  states = normalizeStates(states);

  if (states.length === 1) {
    const state = states[0];
    if (asc === undefined) {
      asc = order[state];
    }
  }

  const end = limit < 0 ? -1 : offset + limit - 1;

  // eslint-disable-next-line prefer-const
  const ids = await queue.getRanges(states, offset, end, asc);
  let jobs = [];
  if (ids.length) {
    const jids = ids as string[];
    jobs = await getMultipleJobsById(queue, ...jids);
    if (states.length === 1) {
      const state = states[0];
      jobs.forEach((job) => {
        job.state = state;
      });
    }
  }

  return jobs;
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

export async function discoverJobTypes(queue: Queue): Promise<string[]> {
  const expiration = ms('5 min'); // todo: make a config value
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
): Promise<string[]> {
  const config = getQueueConfig(hostName, queue.name);
  if (config && config.jobTypes && config.jobTypes.length) {
    return config.jobTypes;
  } else {
    return discoverJobTypes(queue);
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
