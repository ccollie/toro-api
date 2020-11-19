import { JobStatus } from './jobs';

// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events
// although this refers to v3, most of it applies to bullmq
export enum QueueEventsEnum {
  PAUSED = 'paused',
  RESUMED = 'resumed',
  DRAINED = 'drained',
  CLEANED = 'cleaned',
}

export interface AppQueue {
  id: string;
  name: string;
  prefix: string;
  counts: Record<JobStatus, number>;
}
