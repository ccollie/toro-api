import boom from '@hapi/boom';

/**
 * Perform a binary search of a range of a array for a key. The range
 * must be sorted - if it is not, the behaviour of this method is undefined,
 * and may be an infinite loop. If the array contains the key more than once,
 * any one of them may be found.
 *
 * @param haystack the array to search (must be sorted)
 * @param needle the value to search for
 * @param low the lowest index to search from.
 * @param hi the highest index to search to.
 * @return the index at which the key was found, or -n-1 if it was not
 *         found, where n is the index of the first value higher than key or
 *         a.length if there is no such value.
 */
export function binarySearch<T = any>(
  haystack: T[],
  needle: T,
  low?: number,
  hi?: number,
): number {
  if (arguments.length < 3) low = 0;
  if (arguments.length < 4) hi = haystack.length - 1;

  if (low > hi) {
    throw boom.badRequest('The start index is higher than the end index.');
  }

  if (low < 0 || hi > haystack.length) {
    throw boom.badRequest('Index is out of bounds.');
  }

  let mid = 0;
  while (low <= hi) {
    mid = (low + hi) >>> 1;
    const d = haystack[mid];
    if (d == needle) {
      return mid;
    } else if (d > needle) {
      hi = mid - 1;
    } else {
      // This gets the insertion point right on the last loop.
      low = ++mid;
    }
  }

  return -mid - 1;
}
