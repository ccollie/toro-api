// Three-sigma rule
// https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule
import OnlineNormalEstimator from '@server/stats/online-normal-estimator';
import { OutlierOptions, OutlierPredicate } from '@server/stats/outliers/types';

export function sigma(arr: number[], opts?: OutlierOptions): OutlierPredicate {
  const threshold = opts?.threshold || 3.5;

  const estimator = new OnlineNormalEstimator();
  estimator.addAll(arr);
  const mean = estimator.mean;
  const limit = threshold * estimator.standardDeviation;

  return (value: number): boolean => {
    return Math.abs(value - mean) > limit;
  };
}
