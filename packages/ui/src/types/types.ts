import type { HostQueuesFilter, Queue, SortOrderEnum } from './generated';
import { JobState } from './generated';

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
export type States = `${JobState}`;

export type JobStatus = keyof typeof STATUSES;

export type CountStatus = Omit<JobStatus, 'latest'>;

export type SelectedStatuses = Record<Queue['id'], JobStatus>;

export interface QueueFilter extends HostQueuesFilter {
  sortBy?: string;
  sortOrder?: SortOrderEnum;
}

export type JobView = 'card' | 'table';
