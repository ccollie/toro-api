import { JobState, JobView, QueueFilterStatus, SortOrderEnum } from '@/types';
import type { MakeGenerics } from 'react-location';
import type { Queue, QueueHost, QueueWorker } from './generated';

export type LocationGenerics = MakeGenerics<{
  LoaderData: {
    hosts: QueueHost[];
    host: QueueHost;
    queue: Queue;
    workers: QueueWorker[];
  };
  Params: {
    userId: string;
    queueId: string;
    hostId: string;
    metricId: string;
  };
  Search: {
    status: JobState;
    page: number;
    pageSize: number;
    sortBy: string;
    qids: string[];
    excludeIds: string[];
    sortOrder: SortOrderEnum;
    queueStatuses: QueueFilterStatus[];
    jobFilter: string;
    jobView: JobView;
  };
}>;
