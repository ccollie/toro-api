import type {
  BulkStatusItem,
  DiscoverQueuesPayload,
  JobCounts,
  JobLogs,
  JobSchema,
  JobsByFilterInput,
  Queue,
  JobFragment,
  JobSearchStatus,
} from './generated';

import { JobState, SortOrderEnum } from './generated';

export type BulkJobAction = (ids: string[]) => Promise<BulkStatusItem[]>;

export interface SingleJobActions {
  getLogs: (start?: number, end?: number) => Promise<JobLogs>;
  promote: () => Promise<void>;
  retry: () => Promise<void>;
  delete: () => Promise<void>;
  discard: () => Promise<void>;
  moveToCompleted: () => Promise<void>;
  moveToFailed: () => Promise<void>;
  copyToClipboard: () => void;
}

export interface BulkJobActions {
  bulkPromoteJobs: BulkJobAction;
  bulkRetryJobs: BulkJobAction;
  bulkDeleteJobs: BulkJobAction;
  cleanJobs: (
    status: JobState,
    grace?: number,
    limit?: number,
  ) => Promise<number>;
}

export interface FilteredJobsResult {
  jobs: JobFragment[];
  counts: JobCounts;
  current: number;
  total: number;
  cursor: string | undefined;
  hasNext: boolean;
}

export interface QueueJobActions extends BulkJobActions {
  getJobs: (
    queueId: string,
    status: JobSearchStatus,
    page: number,
    pageSize: number,
    sortOrder?: SortOrderEnum,
  ) => Promise<{ jobs: JobFragment[]; counts: JobCounts }>;
  getJobsByFilter: (
    queueId: string,
    filter: JobsByFilterInput,
  ) => Promise<FilteredJobsResult>;
}

export interface HostActions {
  discoverQueues: (
    prefix?: string,
    unregisteredOnly?: boolean,
  ) => Promise<DiscoverQueuesPayload[]>;
  registerQueue: (prefix: string, name: string) => Promise<Queue>;
  unregisterQueue: (id: string) => Promise<boolean>;
}

export interface QueueActions {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  drain: () => Promise<any>;
  delete: () => Promise<number>;
  hide: () => Promise<void>;
  unregister: () => Promise<void>;
}

export interface JobSchemaActions {
  getJobNames: () => Promise<string[]>;
  getSchema: (jobName: string) => Promise<JobSchema | null>;
  inferSchema: (jobName: string) => Promise<JobSchema | null>;
  getSchemas: () => Promise<JobSchema[]>;
  setSchema: (jobName: string, schema: JobSchema) => Promise<JobSchema>;
  deleteSchema: (jobName: string) => Promise<void>;
  getJobOptionsSchema: () => Promise<Record<string, any>>;
}
