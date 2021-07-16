export enum MetricTypes {
  None,
  Apdex,
  ActiveJobs,
  ConnectedClients,
  ConsecutiveFailures,
  Completed,
  CompletedRate,
  CurrentCompletedCount,
  CurrentFailedCount,
  DelayedJobs,
  ErrorRate,
  ErrorPercentage,
  Failures,
  Finished,
  FragmentationRatio,
  InstantaneousOps,
  JobRate,
  Latency,
  PeakMemory,
  PendingCount,
  UsedMemory,
  Waiting,
  WaitingChildren,
  WaitTime,
}

export type MetricTypeName = keyof typeof MetricTypes;

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

export enum MetricValueType {
  Count,
  Gauge,
  Rate,
}

export enum MetricCategory {
  Queue,
  Host,
  Redis,
}

export interface SlidingWindowOptions {
  duration: number;
  granularity?: number;
}

export interface MetricsFilter {
  idRegex?: string;
  jobNames?: string[];
}

export interface MetricOptions {
  sampleInterval?: number;
}

export interface QueueMetricOptions extends MetricOptions {
  jobNames?: string[];
}

export enum MetricsEventsEnum {
  METRIC_ADDED = 'METRIC_ADDED',
  METRIC_ACTIVATED = 'METRIC_ACTIVATED',
  METRIC_DEACTIVATED = 'METRIC_DEACTIVATED',
  METRIC_DELETED = 'METRIC_DELETED',
  METRIC_UPDATED = 'METRIC_UPDATED',
  METRIC_DATA_CLEARED = 'METRIC_DATA_CLEARED',
}

export interface SerializedAggregator {
  type: AggregatorTypes;
  options: Record<string, any>;
}

export interface SerializedMetric {
  id?: string;
  type: MetricTypes;
  name?: string;
  description?: string;
  isActive?: boolean;
  aggregator: SerializedAggregator;
  options: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
}

export interface MetricInfo {
  key: string;
  type: MetricTypes;
  valueType: MetricValueType;
  description: string;
  unit: string;
  category: MetricCategory;
  isPolling: boolean;
}
