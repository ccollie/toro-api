// Iglewicz and Hoaglin method
// Values with a Z-score > 3.5 are considered potential outliers
// Based on https://github.com/alyssaq/stats-analysis

import { median } from '../median';
import type { OutlierOptions, OutlierPredicate } from './types';

export function mad(arr: number[], opts?: OutlierOptions): OutlierPredicate {
  const sorted = opts?.sorted ?? false;
  const threshold = opts?.threshold ?? 3.5;

  const mid = median(arr, sorted);
  let MAD = median(arr.map((e) => Math.abs(e - mid)));

  // eslint-disable-next-line max-len
  // see https://stats.stackexchange.com/questions/339932/iglewicz-and-hoaglin-outlier-test-with-modified-z-scores-what-should-i-do-if-t
  if (MAD == 0) {
    MAD = 2.2250738585072014e-308; // sys.float_info.min
  }

  return (e: number) => Math.abs((0.6745 * (e - mid)) / MAD) > threshold;
}
