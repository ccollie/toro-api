import { SummaryStatistics } from '../../typings';
import { OnlineNormalEstimator, median } from '@alpen/core/stats';

export function calcSummaryStats(
  data: number[],
  isSorted = false,
): SummaryStatistics {
  if (!isSorted) {
    data = data.slice(0).sort((a, b) => a - b);
  }
  const n = data.length;
  const estimator = new OnlineNormalEstimator();
  const min = n === 0 ? undefined : data[0];
  const max = n === 0 ? undefined : data[n - 1];

  data.forEach((x) => {
    estimator.add(x);
  });

  return {
    count: estimator.numSamples,
    min,
    max,
    mean: estimator.mean,
    sampleVariance: estimator.varianceUnbiased,
    variance: estimator.variance,
    standardDeviation: estimator.standardDeviation,
    sampleStandardDeviation: estimator.standardDeviationUnbiased,
    median: median(data, true),
  };
}
