import { Job, Queue } from 'bullmq';
import { JobIdSpec, JobStatusEnum } from '@src/types';
import { Context } from '@server/graphql';

export async function checkState(
  context: Context,
  job: Job,
  ...states: JobStatusEnum[]
): Promise<boolean> {
  const state = await getJobState(context, job);
  return state && states.includes(state as JobStatusEnum);
}

export function getJobState(context: Context, job: Job): Promise<string> {
  return context.loaders.load<Job, string>('jobState', job);
}

export function getJobById(
  context: Context,
  queue: Queue | string,
  id: string,
): Promise<Job> {
  const key: JobIdSpec = {
    queue,
    id,
  };
  return context.loaders.load<JobIdSpec | Job, Job>('jobById', key);
}
