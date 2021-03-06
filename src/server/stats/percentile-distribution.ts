import { createHistogram, DefaultPercentiles } from './utils';
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
  data: Histogram | number[],
  percentiles: number[] = DefaultPercentiles,
): PercentileDistribution {
  let hist: Histogram;
  let result: PercentileDistribution;
  let min: number = Number.MAX_SAFE_INTEGER;
  let max: number = Number.MIN_SAFE_INTEGER;
  let totalCount = 0;

  try {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        min = 0;
        max = 0;
      }
      hist = createHistogram(false);
      data.forEach((datum) => {
        if (datum > 0) {
          hist.recordValue(datum);
          min = Math.min(min, datum);
          max = Math.max(min, datum);
          totalCount++;
        }
      });
    } else {
      hist = data;
      min = hist.minNonZeroValue;
      max = hist.maxValue;
      totalCount = hist.totalCount;
    }

    result = {
      totalCount,
      max,
      min,
      percentiles: percentiles.map((value) => {
        return {
          value,
          count: hist.getValueAtPercentile(value),
        };
      }),
    };
  } finally {
    if (Array.isArray(data) && hist) {
      hist.destroy();
    }
  }
  return result;
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
