import type { HostQueuesFilter, Queue, SortOrderEnum, JobStatus } from './generated';

export const STATUSES = {
  latest: 'latest',
  active: 'active',
  waiting: 'waiting',
  completed: 'completed',
  failed: 'failed',
  delayed: 'delayed',
  paused: 'paused'
} as const;

// https://stackoverflow.com/questions/56841134/use-typescript-enum-values-to-create-new-type
// convert Enum values to type
export type States = `${JobStatus}`;

export type Status = keyof typeof STATUSES;

export type CountStatus = Omit<keyof Queue['jobCounts'], '__typename'>;

export type SelectedStatuses = Record<Queue['id'], Status>;

export interface QueueFilter extends HostQueuesFilter {
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

export type JobView = 'card' | 'table';