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

export enum JobStatusEnum {
  ACTIVE = 'active',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
  STALLED = 'stalled',
  WAITING_CHILDREN = 'waiting-children',
  UNKNOWN = 'unknown',
}

export type JobFinishedState = JobStatusEnum.COMPLETED | JobStatusEnum.FAILED;

export type JobStatus = keyof typeof JobStatusEnum;

export type JobCountStates =
  | JobStatusEnum.COMPLETED
  | JobStatusEnum.WAITING
  | JobStatusEnum.ACTIVE
  | JobStatusEnum.FAILED
  | JobStatusEnum.DELAYED
  | JobStatusEnum.PAUSED
  | JobStatusEnum.WAITING_CHILDREN;

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
  status?: JobStatusEnum;
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
