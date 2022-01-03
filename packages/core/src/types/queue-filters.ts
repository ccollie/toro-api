export enum QueueFilterStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Paused = 'PAUSED',
  Running = 'RUNNING',
}

export interface QueueFilter {
  search?: string;
  prefixes?: string[];
  statuses?: QueueFilterStatus[];
}
