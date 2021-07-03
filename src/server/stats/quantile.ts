/**
 *
 *	LICENSE:
 *		MIT
 *
 *	Copyright (c) 2014. Athan Reines.
 *
 *
 *	AUTHOR:
 *		Athan Reines. kgryte@gmail.com. 2014.
 *
 */

/**
 *	Comparator function used to sort values in ascending order.
 *
 * @param {Number} a
 * @param {Number} b
 * @returns {Number} difference between `a` and `b`
 */
export const ascendingComparator = (a: number, b: number): number => a - b;

export interface QuantileOpts {
  sorted: boolean;
}
/**
 * FUNCTION: quantile( arr, prob[, opts] )
 *	Computes a quantile for a numeric array.
 *
 * @private
 * @param {Array} arr - 1d array
 * @param {Number} p - quantile prob [0,1]
 * @param {Object} [opts] - method options:
 `sorted`: boolean flag indicating if the input array is sorted
 * @returns {Number} quantile value
 */
export function quantile(
  arr: number[],
  p: number,
  opts?: QuantileOpts,
): number {
  if (isNaN(p)) {
    throw new TypeError(
      'quantile()::invalid input argument. Quantile probability must be numeric.',
    );
  }
  if (p < 0 || p > 1) {
    throw new TypeError(
      'quantile()::invalid input argument. Quantile probability must be on the interval [0,1].',
    );
  }

  opts = opts || { sorted: false };

  const len = arr.length;
  let id;

  if (!opts.sorted) {
    arr = arr.slice();
    arr.sort(ascendingComparator);
  }

  // Cases...

  // [0] 0th percentile is the minimum value...
  if (p == 0.0) {
    return arr[0];
  }
  // [1] 100th percentile is the maximum value...
  if (p == 1.0) {
    return arr[len - 1];
  }
  // Calculate the vector index marking the quantile:
  id = len * p - 1;

  // [2] Is the index an integer?
  if (id === Math.floor(id)) {
    // Value is the average between the value at id and id+1:
    return (arr[id] + arr[id + 1]) / 2.0;
  }
  // [3] Round up to the next index:
  id = Math.ceil(id);
  return arr[id];
}
