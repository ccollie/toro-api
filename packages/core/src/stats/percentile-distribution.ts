import { createSketch, DefaultPercentiles} from '../metrics/utils';

export interface Bin {
  index: number;
  count: number;
}

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
  data: number[],
  percentiles: number[] = DefaultPercentiles,
): PercentileDistribution {
  let min: number = Number.MAX_SAFE_INTEGER;
  let max: number = Number.MIN_SAFE_INTEGER;

  if (data.length === 0) {
    min = 0;
    max = 0;
  }
  const hist = createSketch();
  data.forEach((datum) => {
    if (datum > 0) {
      hist.accept(datum);
    }
  });

  return {
    totalCount: hist.count,
    max: hist.max,
    min: hist.min,
    percentiles: percentiles.map((value) => {
      return {
        value,
        count: hist.getValueAtQuantile(value),
      };
    }),
  };
}


// HACK:
