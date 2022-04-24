import { MetricType, SerializedMetricName } from './metric-name';

export const Events = {
  FINISHED: 'job.finished',
  COMPLETED: 'job.completed',
  FAILED: 'job.failed',
  PROGRESS: 'job.progress',
  ACTIVE: 'job.active',
  DELAYED: 'job.delayed',
  STALLED: 'job.stalled',
};

export type JobMetricTypeName =
  | 'job_attempts'
  | 'job_avg_attempts'
  | 'jobs_active'
  | 'jobs_waiting'
  | 'jobs_completed'
  | 'jobs_failed'
  | 'completed_percentage'
  | 'failed_percentage'
  | 'jobs_delayed'
  | 'jobs_pending'
  | 'jobs_waiting_children'
  | 'jobs_runtime_ms'
  | 'jobs_finished'
  | 'jobs_wait_time_ms'
  | 'jobs_process_time_ms';

export type QueueMetricTypeName = 'workers';

export type HostMetricTypeName = 'queues' | 'paused_queues';

export type RedisMetricTypeMame =
  | 'redis_used_memory'
  | 'redis_connected_clients'
  | 'redis_used_memory_peak'
  | 'redis_mem_fragmentation_ratio'
  | 'redis_instantaneous_ops_per_sec';

export type MetricTypeName =
  | RedisMetricTypeMame
  | JobMetricTypeName
  | QueueMetricTypeName
  | HostMetricTypeName;

export type DistributionMetricTypeNames =
    | 'jobs_wait_time_ms'
    | 'jobs_runtime_ms'
    | 'jobs_process_time_ms';

export interface MetricFamily {
  type: MetricTypeName;
  metricType: MetricType;
  unit?: string;
  help?: string;
  description?: string;
}

export interface SerializedMetric {
  id?: string;
  name?: SerializedMetricName;
  createdAt?: number;
  updatedAt?: number;
}

// retention
export type MetricMetadata = {
  createdAt: number;
  firstTs?: number;
  lastTs?: number;
  lastUpdated?: number;
  [key:string]: any;
};
