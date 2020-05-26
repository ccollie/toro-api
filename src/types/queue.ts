import { JobStatus } from 'jobs';

export interface AppQueue {
  id: string;
  name: string;
  counts: Record<JobStatus, number>;
}
