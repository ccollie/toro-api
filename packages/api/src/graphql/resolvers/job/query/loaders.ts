import { Job, Queue } from 'bullmq';
import { JobStatus } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export async function checkState(
  context: EZContext,
  job: Job,
  ...states: JobStatus[]
): Promise<boolean> {
  const state = await getJobState(context, job);
  return state && states.includes(state as JobStatus);
}

export function getJobState(context: EZContext, job: Job): Promise<string> {
  return context.loaders.jobState.load(job);
}

export function getJobById(
  context: EZContext,
  queue: Queue | string,
  id: string,
): Promise<Job> {
  const resolvedQueue =
    typeof queue === 'string' ? context.accessors.getQueueById(id) : queue;
  return context.loaders.jobById.load({ queue: resolvedQueue, id });
}
