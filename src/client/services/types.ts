export type EventHandlerFunction = (data: any) => void;

export interface EventHandlerMap {
  [key: string]: EventHandlerFunction;
}

export interface RequestData {
  [name: string]: any;
}

export type JobId = string | number;

export type JobStatus =
  | 'completed'
  | 'waiting'
  | 'active'
  | 'paused'
  | 'delayed'
  | 'failed';

export type JobCounts = Record<JobStatus, number>;
