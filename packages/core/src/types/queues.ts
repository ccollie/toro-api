// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events
// although this refers to v3, most of it applies to bullmq
import { Job, JobsOptions, Queue, QueueEventsListener } from 'bullmq';

type QueueEventName = keyof QueueEventsListener;

export interface JobIdSpec {
  queue: Queue | string;
  id: string;
}

export function isJobIdSpec(arg: any): arg is JobIdSpec {
  return (
    arg !== undefined &&
    arg.id &&
    arg.queue &&
    (typeof arg.queue === 'string' || arg.queue instanceof Queue)
  );
}

export enum QueueEventsEnum {
  PAUSED = 'paused',
  RESUMED = 'resumed',
  DRAINED = 'drained',
  CLEANED = 'cleaned',
}

export type JobStatus =
  | 'active'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'stalled'
  | 'waiting-children'
  | 'unknown';

export type JobFinishedState = 'completed' | 'failed';

export type JobCountStates =
  | 'active'
  | 'waiting'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'stalled'
  | 'waiting-children';

export type JobCounts = Record<JobCountStates, number>;

export interface AppJob {
  id: string;
  parentKey?: string;
  timestamp: number;
  /** The timestamp at which a worker started processing the job */
  processedOn: number | null;
  /** The timestamp at which worker COMPLETED the job */
  finishedOn: number | null;
  progress: Job['progress'];
  attempts: Job['attemptsMade'];
  failedReason: Job['failedReason'];
  returnvalue: Job['returnvalue'];
  stacktrace: string[];
  opts: JobsOptions;
  data: Job['data'];
  name: Job['name'];
  delay: number | undefined;
  duration: number | undefined;
  nextRun: number | undefined;
  state: string | undefined;
  isStalled: boolean | undefined;
}

export interface RepeatableJob {
  key: string;
  name: string;
  id: string | null;
  endDate: number | null;
  tz: string | null;
  cron: string;
  next: number;
  descr: string;
}

export interface JobCreationOptions {
  name: string;
  data: any;
  opts?: any;
}

export type JobFilter = {
  id: string;
  name: string;
  status?: JobStatus;
  hash: string;
  expression: string;
  createdAt: number;
};

export interface FilteredJobsResult {
  cursor: string;
  total: number;
  current: number;
  jobs: Job[];
}

export interface FilteredJobIdsResult {
  cursor: string;
  total: number;
  current: number;
  ids: string[];
}
