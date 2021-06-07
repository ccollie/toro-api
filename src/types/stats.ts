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

/**
 * Helper interface for serialized {@link Meter} metrics - represents a snapshot of the
 * rates of a {@link Meter}.
 *
 * @export
 * @interface MeteredRates
 */
export interface MeteredRates {
  [rate: number]: number;
}

/**
 * Serializable version of a {@link Meter}.
 *
 * @export
 * @interface MeterSnapshot
 */
export interface MeterSnapshot {
  /**
   * Total count of events reported.
   *
   * @type {number}
   */
  count: number;
  /**
   * mean rate - the meaning of the mean-rate depends on the actual implementation.
   *
   * @type {number}
   */
  meanRate: number;
  /**
   * Mapping of time-frame to rate values - time-unit and meaning depend on the
   * actual implementation.
   *
   * @type {MeteredRates}
   */
  rates: MeteredRates;
}

export interface MeterSummary {
  count: number;
  meanRate: number;
  m1Rate: number;
  m5Rate: number;
  m15Rate: number;
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

export interface TimerSnapshot extends HistogramSnapshot, MeterSummary {}

export interface StatisticalSnapshot extends TimerSnapshot {
  failed?: number;
  completed?: number;
  startTime?: number;
  endTime?: number;
}
