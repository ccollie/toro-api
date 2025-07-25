import { Queue } from 'bullmq';
import { JobCounts, JobCountStates } from '@src/types';
import { Context } from '@server/graphql';
import { JobCountsLoaderKey } from '@server/graphql/loaders/job-counts';

export async function getJobCounts(
  context: Context,
  queue: Queue,
  ...states: JobCountStates[]
): Promise<JobCounts> {
  const key = {
    queue,
    types: states,
  };
  return context.loaders.load<JobCountsLoaderKey, JobCounts>('jobCounts', key);
}

export async function getJobCountByType(
  context: Context,
  queue: Queue,
  ...states: JobCountStates[]
): Promise<number> {
  const counts = await getJobCounts(context, queue, ...states);
  return Object.values(counts).reduce((sum, count) => sum + count);
}
