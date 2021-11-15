export * from './outliers/types';

export type StatsMetricType = 'latency' | 'wait' | 'counts';

export interface TimeseriesDataPoint {
  /** The unix based timestamp of when the measurement occurred */
  ts: number;
  /** The value of the measurement */
  value?: number;
}

export enum PeakSignal {
  NONE,
  ABOVE,
  BELOW = -1,
}

export interface PeakDataPoint extends TimeseriesDataPoint {
  signal: PeakSignal;
}

export enum StatsRateType {
  Throughput = 'Throughput',
  Errors = 'Errors',
  ErrorPercentage = 'ErrorPercentage',
}

export enum StatsGranularity {
  Minute = 'minute',
  Hour = 'hour',
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export type StatsRangeOptions = {
  type?: string;
  metric: StatsMetricType;
  jobName?: string;
  granularity?: StatsGranularity;
};

export type StatsQueryOptions = StatsRangeOptions & {
  start?: Date | number;
  end?: Date | number;
};

export interface StatsWindow {
  /** the total length of the window (ms) */
  duration: number;
  /** the sub-divisions (sampling interval) */
  interval: number;
}

export interface StatisticalSnapshotOptions {
  startTime?: number;
  endTime?: number;
  includeData: boolean;
  counts?: Record<string, number>;
}

export interface HistogramSnapshot {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  count: number;
  p90: number;
  p95: number;
  p99: number;
  p995: number;
  data?: string; // encoded data
}
