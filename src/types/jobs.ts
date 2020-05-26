import { JobsOptions, Job } from 'bullmq';

export const JOB_STATUSES = {
  active: 'active',
  waiting: 'waiting',
  completed: 'completed',
  failed: 'failed',
  delayed: 'delayed',
  paused: 'paused',
};

export type JobStatus = keyof typeof JOB_STATUSES;

export type JobCountStates = 'completed' | 'waiting' | 'active' | 'failed';

export type JobCounts = Record<JobCountStates, number>;

// https://github.com/taskforcesh/bullmq/blob/master/src/classes/job.ts#L11
export type JobField =
  | 'id'
  | 'name'
  | 'data'
  | 'opts'
  | 'progress'
  | 'attemptsMade'
  | 'finishedOn'
  | 'processedOn'
  | 'timestamp'
  | 'failedReason'
  | 'stacktrace'
  | 'returnvalue'
  // computed
  | 'delay'
  | 'state'
  | 'duration'
  | 'nextRun';

export interface AppJob {
  id: string | number | undefined;
  timestamp: number | null;
  processedOn: number | null;
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
}
