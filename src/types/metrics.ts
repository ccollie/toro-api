export enum MetricType {
  Count = 'Count',
  Gauge = 'Gauge',
  Rate = 'Rate',
}

export enum MetricCategory {
  QUEUE = 'Queue',
  HOST = 'Host',
  REDIS = 'Redis',
}

export interface SlidingWindowOptions {
  duration: number;
}
