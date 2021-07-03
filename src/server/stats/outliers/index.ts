// Outlier detection and filtering based on
// https://github.com/alyssaq/stats-analysis
// https://github.com/little-brother/outlier2
import {
  OutlierDetectorConstructor,
  OutlierMethod,
  OutlierOptions,
  OutlierPredicate,
} from './types';
import { sigma } from './sigma';
import { mad } from './mad';
import { iqr } from './iqr';

export { OutlierMethod, OutlierOptions };

const ctors: Record<OutlierMethod, OutlierDetectorConstructor> = {
  [OutlierMethod.IQR]: iqr,
  [OutlierMethod.MAD]: mad,
  [OutlierMethod.Sigma]: sigma,
};

export function getOutlierPredicate(
  type: OutlierMethod,
  arr: number[],
  opts?: OutlierOptions,
): OutlierPredicate {
  const fn = ctors[type];
  return fn(arr, opts);
}

export function getOutliers(
  type: OutlierMethod,
  arr: number[],
  opts?: OutlierOptions,
): number[] {
  if (!arr.length) return [];
  const isOutlier = getOutlierPredicate(type, arr, opts);
  return arr.filter((e, i) => isOutlier(arr[i]));
}

export function getOutlierIndexes(
  type: OutlierMethod,
  arr: number[],
  opts?: OutlierOptions,
): number[] {
  const isOutlier = getOutlierPredicate(type, arr, opts);
  const indexes: number[] = [];
  arr.forEach((x, index) => {
    if (isOutlier(x)) indexes.push(index);
  });
  return indexes;
}

export function filterOutliers(
  type: OutlierMethod,
  arr: number[],
  opts?: OutlierOptions,
): number[] {
  if (!arr.length) return [];
  const isOutlier = getOutlierPredicate(type, arr, opts);
  return arr.filter((e, i) => !isOutlier(arr[i]));
}

export function getOutlierObjects<T = any>(
  type: OutlierMethod,
  arr: T[],
  accessor: (v: T) => number,
  opts?: OutlierOptions,
): T[] {
  if (!arr.length) return [];
  const values = arr.map(accessor);
  const isOutlier = getOutlierPredicate(type, values, opts);
  return arr.filter((element, index) => isOutlier(values[index]));
}

export function filterOutlierObjects<T = any>(
  type: OutlierMethod,
  arr: T[],
  accessor: (v: T) => number,
  opts?: OutlierOptions,
): T[] {
  if (!arr.length) return [];
  const values = arr.map(accessor);
  const isOutlier = getOutlierPredicate(type, values, opts);
  return arr.filter((element, index) => !isOutlier(values[index]));
}
