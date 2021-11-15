import { Queue } from 'bullmq';
import { JobCounts, JobCountStates } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export async function getJobCounts(
  context: EZContext,
  queue: Queue,
  ...states: JobCountStates[]
): Promise<JobCounts> {
  const key = {
    queue,
    types: states,
  };
  return context.loaders.jobCounts.load(key);
}

export async function getJobCountByType(
  context: EZContext,
  queue: Queue,
  ...states: JobCountStates[]
): Promise<number> {
  const counts = await getJobCounts(context, queue, ...states);
  return Object.values(counts).reduce((sum, count) => sum + count);
}
