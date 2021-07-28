import { median } from './median';

export function medianAbsoluteDeviation(
  arr: number[],
  isSorted?: boolean,
  dataMedian?: number,
): number {
  const n = arr.length;
  if (!n) return;
  if (n === 1) return 0;
  dataMedian = dataMedian || median(arr, isSorted);
  const absoluteDeviation = arr.map(function (val) {
    return Math.abs(val - dataMedian);
  });

  return median(absoluteDeviation);
}
