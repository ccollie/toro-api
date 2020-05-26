import boom from '@hapi/boom';
import nanoid from 'nanoid';
import { Job, JobsOptions, Queue } from 'bullmq';
import { safeParse, isNumber } from '../lib/utils';
import { AppJob } from 'jobs';

// https://github.com/taskforcesh/bullmq/blob/master/src/classes/job.ts#L11
export const JobFields = [
  'id',
  'name',
  'data',
  'opts',
  'progress',
  'attemptsMade',
  'finishedOn',
  'processedOn',
  'timestamp',
  'failedReason',
  'stacktrace',
  'returnvalue',
];

/**
 * Get the job state
 * @param {String} queue Queue name
 * @param {String} id job Id
 * @returns {Promise<string>} A promise that resolves to the job state or "unknown"
 */
export async function getJobState(queue: Queue, id: string): Promise<string> {
  const client = await queue.client;
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

export async function createJob(
  queue: Queue,
  name: string,
  data = {},
  opts: JobsOptions = {},
): Promise<Job> {
  const options = {
    removeOnComplete: false, // If true, removes the job when it successfully
    removeOnFail: false,
    ...opts,
  };
  return queue.add(name, data, options); // todo: validate all these
}

export async function processJobCommand(
  cmd: string,
  queue: Queue,
  id: string,
): Promise<void> {
  const job = await queue.getJob(id);
  if (!job) {
    throw boom.notFound(
      `no job with id "${id}" found in queue "${queue.name}"`,
    );
  }
  const state = await getJobState(queue, id);

  switch (cmd) {
    case 'retry':
      if (state === 'completed' || state === 'failed') {
        await job.retry(state);
      } else {
        throw boom.notFound('Only completed or failed jobs can be retried');
      }
      break;
    case 'promote':
      if (state !== 'delayed') {
        throw boom.badRequest(
          `Only "delayed" jobs can be promoted (job ${job.name}#${id})`,
        );
      }
      await job.promote();
      break;
    case 'remove':
      if (state === 'active') {
        const token = nanoid(10);
        await job.discard();
        await job.moveToFailed(new Error('Aborted by user'), token);
      } else {
        await job.remove();
      }
      break;
  }
}

export async function removeJob(queue: Queue, id: string): Promise<void> {
  return processJobCommand('remove', queue, id);
}

export async function retryJob(queue: Queue, id: string): Promise<void> {
  return processJobCommand('retry', queue, id);
}

export async function promoteJob(queue: Queue, id: string): Promise<void> {
  return processJobCommand('promote', queue, id);
}

/**
 * Generate a JSON package to send to the
 * user
 * @param job the job
 * @param state optional state
 */
export function formatJob(job, state: string = undefined): AppJob {
  if (!job) return job;
  if (job.toJSON) {
    job = job.toJSON();
  }
  if (arguments.length > 1) {
    job.state = state;
  }
  if (job.data !== undefined) {
    job.data = safeParse(job.data) || Object.create(null);
  } else {
    job.data = {};
  }
  if (job.opts !== undefined) {
    job.opts = safeParse(job.opts) || Object.create(null);
  } else {
    job.opts = {}; // set to default ?
  }
  if (job.hasOwnProperty('stacktrace')) {
    job.stacktrace = safeParse(job.stacktrace) || [];
  }
  if (job.hasOwnProperty('progress') && !isNumber(job.progress)) {
    job.progress = safeParse(job.progress);
  }
  job.returnvalue = safeParse(job.returnvalue);
  if (job.finishedOn) {
    job.duration = job.finishedOn - job.processedOn;
  }
  if (job.opts) job.delay = job.opts.delay;
  if (job.state === 'delayed') {
    if (isNumber(job.delay)) {
      job.nextRun = job.timestamp + job.delay;
    }
  }
  return job;
}
