// Interquartile range
// https://en.wikipedia.org/wiki/Interquartile_range#Interquartile_range_and_outliers
// Based on https://github.com/MatthewMueller/outliers

import { median } from '@server/stats/median';
import { quantile } from '@server/stats/quantile';
import {
  getOpts,
  OutlierOptions,
  OutlierPredicate,
} from '@server/stats/outliers/types';

export function iqr(array: number[], opts?: OutlierOptions): OutlierPredicate {
  const { sorted } = getOpts(opts);

  let arr = array;
  if (!sorted) {
    arr = array.slice(0).sort((a, b) => a - b);
  }

  const mid = median(arr, true);

  const q3 = quantile(arr, 0.75, { sorted: true });
  const q1 = quantile(arr, 0.25, { sorted: true });
  const range = (q3 - q1) * 1.5;

  return (value: number) => Math.abs(value - mid) > range;
}
