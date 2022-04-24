
export enum MetricCategory {
  Queue,
  Host,
  Redis,
}

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

export interface SlidingWindowOptions {
  duration: number;
  granularity?: number;
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

export interface MetricInfo {
  key: string;
  type: MetricTypes;
  valueType: MetricValueType;
  description: string;
  unit: string;
  category: MetricCategory;
  isPolling: boolean;
}
