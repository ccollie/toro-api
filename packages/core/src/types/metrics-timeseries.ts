
export interface MetricsTimeseries {
  meta: {
    startTs: number;
    endTs: number;
    count: number;
  };
  data: {
    ts: number;
    value: number;
  }[];
}
