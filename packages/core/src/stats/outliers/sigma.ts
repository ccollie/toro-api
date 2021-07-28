// Three-sigma rule
// https://en.wikipedia.org/wiki/68%E2%80%9395%E2%80%9399.7_rule
import type { OutlierOptions, OutlierPredicate } from './types';
import { getBasicStats } from '../basic-stats';

export function sigma(arr: number[], opts?: OutlierOptions): OutlierPredicate {
  const threshold = opts?.threshold || 3.5;
  const { mean, stdDev } = getBasicStats(arr);
  const limit = threshold * stdDev;

  return (value: number): boolean => {
    return Math.abs(value - mean) > limit;
  };
}
