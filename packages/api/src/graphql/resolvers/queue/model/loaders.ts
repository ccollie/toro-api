import { Queue } from 'bullmq';
import { JobCounts, JobCountStates, loaders } from '@alpen/core';

export async function getJobCounts(
  queue: Queue,
  ...states: JobCountStates[]
): Promise<JobCounts> {
  const key = {
    queue,
    types: states,
  };
  return loaders.jobCounts.load(key);
}

export async function getJobCountByType(
  queue: Queue,
  ...states: JobCountStates[]
): Promise<number> {
  const counts = await getJobCounts(queue, ...states);
  return Object.values(counts).reduce((sum, count) => sum + count);
}
