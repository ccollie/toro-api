import boom from '@hapi/boom';
import nanoid from 'nanoid';
import { Job, Queue } from 'bullmq';
import pSettle, { PromiseRejectedResult } from 'p-settle';
import { getMultipleJobsById } from './queue';
import { JobStatusEnum } from '../../types';

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
 * Get the job states
 * @param {String} queue Queue names
 * @param {String} id job Id
 * @param client
 * @returns {Promise<string>} A promise that resolves to the job states or "unknown"
 */
export async function getJobState(
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

export async function multiGetJobState(
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

async function processJobInternal(
  cmd: string,
  job: Job,
  state: JobStatusEnum,
): Promise<Job> {
  switch (cmd) {
    case 'retry':
      if (state === JobStatusEnum.COMPLETED || state === JobStatusEnum.FAILED) {
        await job.retry(state);
      } else {
        throw boom.notFound('Only COMPLETED or FAILED jobs can be retried');
      }
      break;
    case 'promote':
      if (state !== JobStatusEnum.DELAYED) {
        throw boom.badRequest(
          `Only "delayed" jobs can be promoted (job ${job.name}#${job.id})`,
        );
      }
      await job.promote();
      break;
    case 'remove':
      if (state === JobStatusEnum.ACTIVE) {
        const token = nanoid(10);
        await job.discard();
        await job.moveToFailed(new Error('Aborted by user'), token);
      } else {
        await job.remove();
      }
      break;
  }

  return job;
}

export async function processJobCommand(
  cmd: string,
  queue: Queue,
  id: string,
): Promise<Job> {
  const job = await queue.getJob(id);
  if (!job) {
    throw boom.notFound(
      `no job with id "${id}" found in queue "${queue.name}"`,
    );
  }

  // NOTE!! - backdoor optimization especially for bulk actions
  let state = (job as any).state;
  if (!state) {
    state = await getJobState(queue, id);
    (job as any).state = state;
  }

  return processJobInternal(cmd, job, state);
}

export async function removeJob(queue: Queue, id: string): Promise<Job> {
  return processJobCommand('remove', queue, id);
}

export async function retryJob(queue: Queue, id: string): Promise<Job> {
  return processJobCommand('retry', queue, id);
}

export async function promoteJob(queue: Queue, id: string): Promise<Job> {
  return processJobCommand('promote', queue, id);
}

export interface BulkActionResult {
  id: string;
  success: boolean;
  reason: unknown;
}

export async function bulkJobHandler(
  action: string,
  queue: Queue,
  ids: string[],
): Promise<BulkActionResult[]> {
  const jobs = await getMultipleJobsById(queue, ids);
  const foundMap = jobs.reduce((res, job) => {
    res.set(job.id, job);
    return res;
  }, new Map<string, Job>());

  const status = [];

  // handle not found items
  ids.forEach((id) => {
    if (!foundMap.has(id)) {
      const result = {
        id,
        success: false,
        reason: 'not found',
      };
      status.push(result);
    }
  });

  if (jobs.length) {
    const jids = jobs.map((job) => job.id);
    const states = await multiGetJobState(queue, jids);
    const promises = jobs.map((job, index) => {
      const state = states[index] as JobStatusEnum;
      return processJobInternal(action, job, state);
    });
    const settled = await pSettle(promises, { concurrency: 4 });
    settled.forEach((info, index) => {
      const result = {
        id: jobs[index].id,
        success: info.isFulfilled,
        reason: undefined,
      };
      if (!info.isFulfilled) {
        result.reason = (info as PromiseRejectedResult).reason;
      }
      status.push(result);
    });
  }

  return status;
}

export async function bulkRemoveJobs(
  queue: Queue,
  ids: string[],
): Promise<BulkActionResult[]> {
  return bulkJobHandler('remove', queue, ids);
}

export async function bulkRetryJobs(
  queue: Queue,
  ids: string[],
): Promise<BulkActionResult[]> {
  return bulkJobHandler('retry', queue, ids);
}

export async function bulkPromoteJobs(
  queue: Queue,
  ids: string[],
): Promise<BulkActionResult[]> {
  return bulkJobHandler('promote', queue, ids);
}
