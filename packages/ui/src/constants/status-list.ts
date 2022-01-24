import type { Status } from '@/types';

export const STATUS_LIST: Readonly<Status[]> = [
  'latest',
  'active',
  'waiting',
  'completed',
  'failed',
  'delayed',
  'paused',
] as const;

export const JobCleanStatuses: Readonly<Status[]> = [
  'completed',
  'waiting',
  'active',
  'delayed',
  'failed',
] as const;
