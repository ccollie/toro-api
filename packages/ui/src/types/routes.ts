import { JobView, QueueFilterStatus, SortOrderEnum } from '@/types';
import type { MakeGenerics } from 'react-location';
import type { Queue, QueueHost, QueueWorker } from './generated';
import type { Status } from './types';

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
  };
  Search: {
    status: Status;
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
