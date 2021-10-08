import { Queue } from 'bullmq';
import { JobCounts, JobCountStates, JobStatusEnum } from '@alpen/core';
import { JobCountsLoaderKey } from '../../../loaders/job-counts';
import { EZContext } from 'graphql-ez';
import { JobMemoryLoaderKey, JobMemoryLoaderResult } from '../../../loaders/job-memory';

export async function getJobCounts(
  context: EZContext,
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
  context: EZContext,
  queue: Queue,
  ...states: JobCountStates[]
): Promise<number> {
  const counts = await getJobCounts(context, queue, ...states);
  return Object.values(counts).reduce((sum, count) => sum + count);
}

export async function getJobMemoryUsage(
  context: EZContext,
  queue: Queue,
  state: JobStatusEnum,
  limit?: number,
  jobName?: string,
): Promise<JobMemoryLoaderResult> {
  const loader = context.loaders.getLoader<
    JobMemoryLoaderKey,
    JobMemoryLoaderResult,
    string
    >('jobMemoryUsage');
  const key: JobMemoryLoaderKey = {
    queue,
    state,
    limit,
    jobName,
  };
  return loader.load(key);
}

export async function getJobMemoryAvg(
  context: EZContext,
  queue: Queue,
  state: JobStatusEnum,
  limit?: number,
  jobName?: string,
): Promise<number> {
  const { byteCount, jobCount } = await getJobMemoryUsage(
    context,
    queue,
    state,
    limit,
    jobName,
  );
  return byteCount / (jobCount || 1);
}
