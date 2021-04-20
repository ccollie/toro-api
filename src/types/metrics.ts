export enum MetricType {
  Count = 'Count',
  Gauge = 'Gauge',
  Rate = 'Rate',
}

export enum MetricCategory {
  Queue = 'Queue',
  Host = 'Host',
  Redis = 'Redis',
}

export interface SerializedAggregator {
  type: string;
  options: Record<string, any>;
}

export interface SlidingWindowOptions {
  duration: number;
}

export interface MetricsFilter {
  idRegex?: string;
  jobNames?: string[];
}

export interface MetricOptions {
  id?: string;
  name?: string;
  jobNames?: string[];
}

export interface PollingMetricOptions extends MetricOptions {
  interval: number;
}
