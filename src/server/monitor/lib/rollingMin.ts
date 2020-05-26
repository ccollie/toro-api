// Original code:
// https://github.com/chrvadala/sliding-window-max
// Modified to use Deque to minimize runtime memory allocations
import Deque from 'double-ended-queue';
const DEFAULT_COMPARATOR = (a, b) => b - a;

class RollingMin {
  private index: number;
  private readonly list: Deque;
  private windowSize: number;
  private waitFullRange: boolean;
  private readonly higherThan: (a, b) => boolean;
  /**
   * Given a stream of data, this algorithm returns (for every added value) the current min value.
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
    this.higherThan = (a, b) => comparator(a, b) < 0;
  }

  get count() {
    return this.list.length;
  }

  add(value) {
    const list = this.list;
    const i = this.index;
    const windowSize = this.windowSize;
    const higherThan = this.higherThan;
    const waitFullRange = this.waitFullRange;

    // Remove anything that is less than the current value
    // so this.list maintains values greater than the current value
    while (!list.isEmpty() && higherThan(list.peekBack().value, value)) {
      list.pop();
    }

    // In case that all elements in the this.list are all greater than the
    // current one (descending order)
    // Shift out the
    if (!list.isEmpty() && list.get(0).i < i - windowSize + 1) {
      list.shift();
    }

    list.push({ i, value });

    // For each sliding window movement, we record the highest value in that sliding window
    // i >= windowSize - 1 to ensure that we don't prematurely record values before we get
    // to the full range of the first sliding window
    // e.g. [1  3  -1] -3  5  3  6  7       3
    // this ensure that i is at least at -1 (index 2)
    this.index++;

    const result = list.peekFront().value;
    if (i >= windowSize - 1) {
      return result;
    }

    return waitFullRange ? null : result;
  }

  clear() {
    this.list.clear();
    this.index = 0;
  }
}

module.exports = RollingMin;
