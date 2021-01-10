export type StatsMetricType = 'latency' | 'wait' | 'counts';

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
  includePercentiles: boolean;
  percentiles?: number[];
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

export interface StatisticalSnapshot extends HistogramSnapshot {
  failed?: number;
  completed?: number;
  startTime?: number;
  endTime?: number;
}

export interface StatsTimer extends StatisticalSnapshot {
  m1Rate: number;
  m5Rate: number;
  m15Rate: number;
  meanRate: number;
  errorM1Rate: number;
  errorM5Rate: number;
  errorM15Rate: number;
  errorMeanRate: number;
}
