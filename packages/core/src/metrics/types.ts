import { MetricType } from './metric-name';

export const Events = {
  FINISHED: 'job.finished',
  COMPLETED: 'job.completed',
  FAILED: 'job.failed',
  PROGRESS: 'job.progress',
  ACTIVE: 'job.active',
  DELAYED: 'job.delayed',
  STALLED: 'job.stalled',
};

export enum MetricCategory {
  Queue,
  Host,
  Redis,
}

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

export type DistributionAggregate =
  | 'sum'
  | 'count'
  | 'avg'
  | 'min'
  | 'max'
  | 'p50'
  | 'p75'
  | 'p90'
  | 'p99';

export type ExtendedMetricTypeName = {
  metric: MetricTypeName;
  aggregate?: DistributionAggregate;
};

export enum AggregatorTypes {
  None,
  Identity,
  Ewma,
  Latest,
  Min,
  Max,
  Mean,
  Sum,
  StdDev,
  Quantile,
  P75,
  P90,
  P95,
  P99,
  P995,
}

export type AggregatorTypeName = keyof typeof AggregatorTypes;

export interface SerializedAggregator {
  type: AggregatorTypes;
  options: Record<string, any>;
}

export enum MetricValueType {
  Count,
  Gauge,
  Rate,
}

export interface MetricInfo {
  key: string;
  type: MetricTypeName;
  valueType: MetricValueType;
  description: string;
  unit: string;
  category: MetricCategory;
}

export interface MetricFamily {
  type: MetricTypeName;
  metricType: MetricType;
  unit?: string;
  help?: string;
  description?: string;
}

// retention
export type MetricMetadata = {
  createdAt: number;
  firstTs?: number;
  lastTs?: number;
  lastUpdated?: number;
  [key: string]: any;
};

export enum MetricsEventsEnum {
  METRIC_ADDED = 'METRIC_ADDED',
  METRIC_ACTIVATED = 'METRIC_ACTIVATED',
  METRIC_DEACTIVATED = 'METRIC_DEACTIVATED',
  METRIC_DELETED = 'METRIC_DELETED',
  METRIC_UPDATED = 'METRIC_UPDATED',
  METRIC_DATA_CLEARED = 'METRIC_DATA_CLEARED',
}

export interface SlidingWindowOptions {
  duration: number;
  granularity?: number;
}
