/* global test, expect */

import {
  RollingMax,
  RollingMaxOptions,
} from '../../../../src/server/monitor/lib';

function _calculateExpectedResultUtils(slidingWindow, dataset): any[] {
  const res = [];

  for (let i = 0; i < dataset.length - slidingWindow + 1; i++) {
    const array = dataset.slice(i, i + slidingWindow);
    const max = array.reduce((max, cur) => Math.max(max, cur));
    res.push(max);
  }

  return res;
}

describe('RollingMax', () => {
  test.each([
    /** basic */
    {
      windowSize: 3,
      options: undefined,

      dataset: [1, 3, -1, -3, 5, 3, 6, 7],
      expectedResults: [null, null, 3, 3, 5, 5, 6, 7],
    },

    /** windowSize=6 **/
    {
      windowSize: 6,
      options: undefined,

      dataset: [0, 10, 20, 30, 20, 10, 20, 30, 40, 30, 20, 10, 20, 30, 20, 10],
      expectedResults: [
        null,
        null,
        null,
        null,
        null,
        30,
        30,
        30,
        40,
        40,
        40,
        40,
        40,
        40,
        30,
        30,
      ],
    },

    /** waitFullRange=false **/
    {
      windowSize: 3,
      options: { waitFullRange: false },

      dataset: [1, 3, -1, -3, 5, 3, 6, 7],
      expectedResults: [1, 3, 3, 3, 5, 5, 6, 7],
    },

    /** waitFullRange=false **/
    {
      windowSize: 3,
      options: { waitFullRange: false },

      dataset: [0, 10, 20, 30, 20, 10, 20, 30, 40, 30, 20, 10, 20, 30, 20, 10],
      expectedResults: [
        0,
        10,
        20,
        30,
        30,
        30,
        20,
        30,
        40,
        40,
        40,
        30,
        20,
        30,
        30,
        30,
      ],
    },

    /** custom comparator **/
    {
      windowSize: 3,
      options: { comparator: (a, b) => b.v - a.v },

      dataset: [
        { v: 0 },
        { v: 10 },
        { v: 20 },
        { v: 30 },
        { v: 20 },
        { v: 100 },
      ],
      expectedResults: [
        null,
        null,
        { v: 20 },
        { v: 30 },
        { v: 30 },
        { v: 100 },
      ],
    },

    /** custom comparator **/
    {
      windowSize: 3,
      options: { waitFullRange: false, comparator: (a, b) => b.v - a.v },

      dataset: [
        { v: 0, n: 1 },
        { v: 10, n: 2 },
        { v: 20, n: 3 },
        { v: 30, n: 4 },
        { v: 20, n: 5 },
      ],
      expectedResults: [
        { v: 0, n: 1 },
        { v: 10, n: 2 },
        { v: 20, n: 3 },
        { v: 30, n: 4 },
        { v: 30, n: 4 },
      ],
    },
  ])(
    ' sliding window max with sample %#',
    ({ dataset, expectedResults, options, windowSize }) => {
      const slidingWindowMax = new RollingMax(windowSize, options);

      expect(dataset.length).toEqual(expectedResults.length);

      for (let i = 0; i < dataset.length; i++) {
        const cur = dataset[i];
        const res = expectedResults[i];
        const max = slidingWindowMax.add(cur);
        expect(max).toEqual(res);
      }
    },
  );

  test('test _calculateExpectedResultUtils', () => {
    expect(
      _calculateExpectedResultUtils(3, [1, 3, -1, -3, 5, 3, 6, 7]),
    ).toEqual([3, 3, 5, 5, 6, 7]);
  });

  test('');
});
