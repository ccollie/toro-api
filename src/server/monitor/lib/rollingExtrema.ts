// Original code:
// https://github.com/chrvadala/sliding-window-max
// Modified to use Deque to minimize runtime memory allocations
// eslint-disable-next-line max-len
// see also https://people.cs.uct.ac.za/~ksmith/articles/sliding_window_minimum.html#sliding-window-minimum-algorithm
import Deque from 'double-ended-queue';
const DEFAULT_COMPARATOR = (a, b) => {
  return a === b ? 0 : a > b ? 1 : -1;
};

enum Extrema {
  MIN,
  MAX,
}

export class RollingExtrema<T = number> {
  private index: number;
  private readonly list: Deque;
  private readonly windowSize: number;
  private readonly waitFullRange: boolean;
  private readonly compare: (a: T, b: T) => boolean;
  private _value: T = null;
  private readonly _extrema: Extrema;

  /**
   * Given a stream of data, this algorithm returns (for every added value) the current
   * min/max value.
   * It uses a strategy that:
   *    Stores at most a number of values defined by the window size
   *    Avoids to scan all the values to calculate the max value
   * @param {Number} windowSize Defines how many values should be considered to calculate the max
   * @param {Object} options options
   * @param {Function} options.comparator Override the custom comparator function
   * @param {Boolean} options.waitFullRange If false the functions returns the max value
   * also if the window size hasn't been reached yet
   */
  constructor(
    windowSize: number,
    options = {
      comparator: DEFAULT_COMPARATOR,
      waitFullRange: true,
      extrema: Extrema,
    },
  ) {
    this.index = 0;
    this.list = new Deque(windowSize);
    this.windowSize = windowSize;

    this.waitFullRange = options.hasOwnProperty('waitFullRange')
      ? options.waitFullRange
      : true;
    const comparator = options.comparator
      ? options.comparator
      : DEFAULT_COMPARATOR;
    this.compare =
      this._extrema === Extrema.MAX
        ? (a, b) => comparator(a, b) > 0
        : (a, b) => comparator(a, b) < 0;
  }

  get count(): number {
    return this.list.length;
  }

  get value(): T {
    return this._value;
  }

  add(value: T): T {
    const list = this.list;
    const i = this.index;
    const waitFullRange = this.waitFullRange;

    // Remove anything that is less (or greater based on _extrema) than the current value
    while (!list.isEmpty() && this.compare(list.peekBack().value, value)) {
      list.pop();
    }

    list.push({ i, value });

    // In case all elements in this.list are all less than the
    // current one (descending order)
    if (!list.isEmpty() && list.peekFront().i <= i - this.windowSize) {
      list.shift();
    }

    // For each sliding window movement, we record the highest/lowest value in that sliding window
    // i >= windowSize - 1 to ensure that we don't prematurely record values before we get
    // to the full range of the first sliding window
    // e.g. [1  3  -1] -3  5  3  6  7       3
    // this ensure that i is at least at -1 (index 2)
    this.index++;

    const result = list.peekFront().value;
    if (i >= this.windowSize - 1) {
      return result;
    }

    this._value = waitFullRange ? null : result;
    return this._value;
  }

  clear(): void {
    this.list.clear();
    this.index = 0;
    this._value = null;
  }
}
