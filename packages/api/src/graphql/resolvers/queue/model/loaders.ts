import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { JobCounts } from '@alpen/core';
import { EZContext } from 'graphql-ez';

export async function getJobCounts(
  context: EZContext,
  queue: Queue,
  ...states: JobType[]
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
  ...states: JobType[]
): Promise<number> {
  const counts = await getJobCounts(context, queue, ...states);
  return states.reduce((acc, state) => {
    return acc + (counts[state] ?? 0);
  }, 0);
}
