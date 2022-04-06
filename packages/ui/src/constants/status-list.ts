import type { JobStatus } from '@/types';

export const STATUS_LIST: Readonly<JobStatus[]> = [
  'latest',
  'active',
  'waiting',
  'completed',
  'failed',
  'delayed',
  'paused',
] as const;

export const JobCleanStatuses: Readonly<JobStatus[]> = [
  'completed',
  'waiting',
  'active',
  'delayed',
  'failed',
] as const;
