export enum StatsGranularity {
  Minute = 'minute',
  Hour = '',
  Day = 'day',
  Week = 'week',
  Month = 'month',
}

export type StatsRangeOptions = {
  type?: string;
  metric: string;
  jobName?: string;
  granularity?: StatsGranularity;
};

export type StatsQueryOptions = StatsRangeOptions & {
  start?: Date | number;
  end?: Date | number;
};

export interface StatsWindow {
  /** the total length of the window */
  duration: number;
  /** the sub-divisions (sampling interval) */
  period: number;
}

export interface StatisticalSnapshotOptions {
  includePercentiles: boolean;
  percentiles?: number[];
  startTime?: number;
  endTime?: number;
  includeData: boolean;
  counts?: Record<string, number>;
}

export interface StatisticalSnapshot {
  failed?: number;
  completed?: number;
  count: number;
  mean: number;
  min: number;
  max: number;
  stddev: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  // eslint-disable-next-line camelcase
  p99_5: number;
  data?: string;
  startTime?: number;
  endTime?: number;
}
