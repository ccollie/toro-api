import { jobById } from './job-by-id';
import { jobCounts, jobCountsByType } from './job-counts';
import { jobState } from './job-state';
import { jobInState } from './job-in-state';
import { queuePausedLoader } from './queue-paused';
import { workerCount, workers } from './queue-workers';
import { jobMemoryUsage } from './job-memory';
import { queueRepeatableCount } from './queue-repeatable-count';
import { metricDateRange } from './metric-date-range';
import { metricData } from './metric-data';
import { queueAlertCount } from './queue-alert-count';
import { redisInfoByHostId, redisInfoByHost } from './redis-info';

export type { JobByIdLoaderKey, JobInStateLoaderKey } from './types';
export type { JobCountsLoaderKey } from './job-counts';
export type { JobMemoryLoaderKey, JobMemoryLoaderResult } from './job-memory';
export type { MetricDataLoaderKey } from './metric-data';

export const loaders = {
  jobById,
  jobCounts,
  jobCountsByType,
  jobInState,
  jobMemoryUsage,
  jobState,
  metricData,
  metricDateRange,
  queueAlertCount,
  queuePaused: queuePausedLoader,
  queueRepeatableCount,
  redisInfoByHost,
  redisInfoByHostId,
  workers,
  workerCount,
};
