import { Job, Queue } from 'bullmq';

export interface JobByIdLoaderKey {
  queue: Queue;
  id: string;
}

export type JobLocator = Job | JobByIdLoaderKey;

export function isJob(arg: any): arg is Job {
  return arg && arg instanceof Job;
}

export type JobInStateLoaderKey = {
  job: JobLocator;
  states: string[];
};
