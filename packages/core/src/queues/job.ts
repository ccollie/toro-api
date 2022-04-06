import { isNumber } from '@alpen/shared';
import {  notFound, badRequest } from '@hapi/boom';
import { Job, JobState, Queue } from 'bullmq';
import type { JobJson } from 'bullmq';
import pSettle, { PromiseRejectedResult } from 'p-settle';
import { getMultipleJobsById } from './queue';
import type { JobStatus } from '../types';
import { Scripts } from '../commands';

// All this malarkey is to make sure that we get a compile error if we're
// out of sync with bullmq's types.
// eslint-disable-next-line max-len
// see https://stackoverflow.com/questions/43909566/get-keys-of-a-typescript-interface-as-array-of-strings
export class MyJobJson implements JobJson {
  attemptsMade: JobJson['attemptsMade'];
  data: JobJson['data'];
  failedReason: JobJson['failedReason'];
  id: JobJson['id'];
  name: JobJson['name'];
  opts: JobJson['opts'];
  progress: JobJson['progress'];
  returnvalue: JobJson['returnvalue'];
  stacktrace: JobJson['stacktrace'];
  timestamp: JobJson['timestamp'];
  finishedOn?: JobJson['finishedOn'];
  processedOn?: JobJson['processedOn'];
  parentKey?: JobJson['parentKey'];
  state?: JobState;
}

// The properties of a Job object
export type JobPropsArray = Array<keyof MyJobJson>;

// Properties of the Job type
export const JobProps: JobPropsArray =
  Object.keys(new MyJobJson()) as JobPropsArray;


export function calculateResponseTime(job: JobJson | Job ): number | undefined {
  return isNumber(job.finishedOn)
    ? job.finishedOn - job.timestamp
    : undefined;
}

export function calculateProcessTime(job: JobJson | Job ): number | undefined {
  return isNumber(job.finishedOn) && isNumber(job.processedOn)
    ? job.finishedOn - job.processedOn
    : undefined;
}

export function calculateWaitTime(job: JobJson | Job ): number | undefined {
  return isNumber(job.processedOn)
    ? job.processedOn - job.timestamp
    : undefined;
}


async function processJobInternal(
  queue: Queue,
  cmd: string,
  job: Job,
  state: JobStatus,
): Promise<Job> {
  switch (cmd) {
    case 'retry':
      if (state === 'completed' || state === 'failed') {
        await job.retry(state);
      } else {
        throw notFound('Only COMPLETED or FAILED jobs can be retried');
      }
      break;
    case 'promote':
      if (state !== 'delayed') {
        throw badRequest(
          `Only "delayed" jobs can be promoted (job ${job.name}#${job.id})`,
        );
      }
      await job.promote();
      break;
    case 'remove':
      if (state === 'active') {
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
    throw notFound(
      `no job with id "${id}" found in queue "${queue.name}"`,
    );
  }

  // NOTE!! - backdoor optimization especially for bulk actions
  let state = (job as any).state;
  if (!state) {
    state = await job.getState();
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
      const state = states[index] as JobStatus;
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

export function getJobKeyProperties(jobData: string): {
  id?: string;
  queueName?: string;
} {
  if (!jobData) return {};
  const [, queueName, id] = jobData.split(':');

  return {
    id,
    queueName,
  };
}
