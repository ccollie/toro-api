import boom from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import pSettle, { PromiseRejectedResult } from 'p-settle';
import { getMultipleJobsById } from './queue';
import { JobStatusEnum } from './types';
import { Scripts } from '../commands';

// https://github.com/taskforcesh/bullmq/blob/master/src/classes/job.ts#L11
export const JobFields = [
  'id',
  'name',
  'parentKey',
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

async function processJobInternal(
  queue: Queue,
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
        await job.discard();
        await job.moveToFailed(new Error('Aborted by user'), queue.token);
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
    state = await Scripts.getJobState(queue, id);
    (job as any).state = state;
  }

  return processJobInternal(queue, cmd, job, state);
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
    const ids = jobs.map((job) => job.id);
    const states = await Scripts.multiGetJobState(queue, ids);
    const promises = jobs.map((job, index) => {
      const state = states[index] as JobStatusEnum;
      return processJobInternal(queue, action, job, state);
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

export function getJobKeyProperties(jobData: string) {
  if (!jobData) return {};
  const [, queueName, id] = jobData.split(':');

  return {
    id,
    queueName,
  };
}
