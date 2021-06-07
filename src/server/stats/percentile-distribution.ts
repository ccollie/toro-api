import { DefaultPercentiles } from './utils';
import { StatisticalSnapshot } from '@src/types';
import { build, decodeFromCompressedBase64, Histogram } from 'hdr-histogram-js';

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
  hist: Histogram,
  percentiles: number[] = DefaultPercentiles,
): PercentileDistribution {
  return {
    totalCount: hist.totalCount,
    max: hist.maxValue,
    min: hist.minNonZeroValue,
    percentiles: percentiles.map((value) => {
      return {
        value,
        count: hist.getValueAtPercentile(value),
      };
    }),
  };
}

export function getSnapshotPercentileDistribution(
  snapshot: StatisticalSnapshot,
  percentiles: number[] = DefaultPercentiles,
): PercentileDistribution {
  let hist: Histogram;
  if (!snapshot.data) {
    hist = build({
      numberOfSignificantValueDigits: 2,
      bitBucketSize: 32,
      useWebAssembly: false,
    });
  } else {
    hist = decodeFromCompressedBase64(snapshot.data, 32, true);
  }
  try {
    return getPercentileDistribution(hist, percentiles);
  } finally {
    hist.destroy();
  }
}
