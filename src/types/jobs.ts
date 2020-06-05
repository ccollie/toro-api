import { JobsOptions, Job } from 'bullmq';

export enum JobStatusEnum {
  active = 'active',
  waiting = 'waiting',
  completed = 'completed',
  failed = 'failed',
  delayed = 'delayed',
  paused = 'paused',
  UNKNOWN = 'unknown',
}

export type JobStatus = keyof typeof JobStatusEnum;

export type JobCountStates = 'completed' | 'waiting' | 'active' | 'failed';

export type JobCounts = Record<JobCountStates, number>;

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
