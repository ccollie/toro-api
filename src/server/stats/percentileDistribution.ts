import { AbstractHistogram } from 'hdr-histogram-js/AbstractHistogram';

export type PercentileDistribution = {
  totalCount: number;
  max: number;
  min: number;
  percentiles: Array<{
    value: number;
    count: number;
  }>;
};

export function getPercentileDistribution(
  hist: AbstractHistogram,
  percentiles: number[],
): PercentileDistribution {
  return {
    totalCount: hist.getTotalCount(),
    max: hist.maxValue,
    min: hist.lowestDiscernibleValue,
    percentiles: percentiles.map((value) => {
      return {
        value,
        count: hist.getValueAtPercentile(value),
      };
    }),
  };
}
