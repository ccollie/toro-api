
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

export interface StatsSnapshot {
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  sum: number;
  count: number;
  p90: number;
  p95: number;
  p99: number;
  p995: number;
}
