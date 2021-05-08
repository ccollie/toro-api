export enum MetricTypes {
  None = 'None',
  Apdex = 'Apdex',
  ConnectedClients = 'ConnectedClients',
  ConsecutiveFailures = 'ConsecutiveFailures',
  Completed = 'Completed',
  CompletedRate = 'CompletedRate',
  ActiveJobs = 'ActiveJobs',
  CurrentCompletedCount = 'CurrentCompletedCount',
  DelayedJobs = 'DelayedJobs',
  CurrentFailedCount = 'CurrentFailedCount',
  Waiting = 'Waiting',
  ErrorRate = 'ErrorRate',
  ErrorPercentage = 'ErrorPercentage',
  Failures = 'Failures',
  Finished = 'Finished',
  FragmentationRatio = 'FragmentationRatio',
  JobRate = 'JobRate',
  Latency = 'Latency',
  UsedMemory = 'UsedMemory',
  PeakMemory = 'PeakMemory',
  InstantaneousOps = 'InstantaneousOps',
  WaitTime = 'WaitTime',
}

export enum AggregatorTypes {
  None = 'None',
  Identity = 'Identity',
  Ewma1Min = 'Ewma1Min',
  Ewma5Min = 'Ewma5Min',
  Ewma15Min = 'Ewma15Min',
  Latest = 'Latest',
  Min = 'Min',
  Max = 'Max',
  Mean = 'Mean',
  Sum = 'Sum',
  StdDev = 'StdDev',
  Quantile = 'Quantile',
  P75 = 'P75',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
  P995 = 'P995',
}

export enum MetricValueType {
  Count = 'Count',
  Gauge = 'Gauge',
  Rate = 'Rate',
}

export enum MetricCategory {
  Queue = 'Queue',
  Host = 'Host',
  Redis = 'Redis',
}

export interface SlidingWindowOptions {
  duration: number;
}

export interface MetricsFilter {
  idRegex?: string;
  jobNames?: string[];
}

export interface MetricOptions {
  jobNames?: string[];
}

export interface PollingMetricOptions extends MetricOptions {
  interval: number;
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
  id: string;
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
