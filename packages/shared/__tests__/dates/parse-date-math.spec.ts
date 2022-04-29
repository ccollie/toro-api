/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { parseISO } from 'date-fns';
import {
  startOf as _startOf,
  endOf as _endOf,
  add as _add,
  unitsDesc,
  unitsAsc,
} from '../dates';
import { parseDateMath } from '../dates';

function startOf(date: Date, unit: string): Date {
  unit = unit === 'M' ? 'month' : unit;
  return _startOf(date, unit);
}

function endOf(date: Date, unit: string): Date {
  unit = unit === 'M' ? 'month' : unit;
  return _endOf(date, unit);
}

function add(date: Date, amount: number, unit: string): Date {
  unit = unit === 'M' ? 'month' : unit;
  return _add(date, amount, unit);
}

function subtract(date: Date, amount: number, unit: string): Date {
  return add(date, -amount, unit);
}

describe('dateMath', function () {
  // Test each of these intervals when testing relative time
  const spans = ['s', 'm', 'h', 'd', 'w', 'M', 'y', 'ms'];
  const anchor = '2014-01-01T06:06:06.666Z';
  const anchoredDate = new Date(Date.parse(anchor));
  const unix = parseISO(anchor).valueOf();
  const format = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

  describe('errors', function () {
    it('should return undefined if I pass an operator besides [+-/]', function () {
      expect(parseDateMath('now&1d')).toBeUndefined();
    });

    it(
      'should return undefined if I pass a unit besides' + spans.toString(),
      function () {
        expect(parseDateMath('now+5f')).toBeUndefined();
      },
    );

    it('should return undefined if rounding unit is not 1', function () {
      expect(parseDateMath('now/2y')).toBeUndefined();
      expect(parseDateMath('now/0.5y')).toBeUndefined();
    });

    it('should not go into an infinite loop when missing a unit', function () {
      expect(parseDateMath('now-0')).toBeUndefined();
      expect(parseDateMath('now-00')).toBeUndefined();
      expect(parseDateMath('now-000')).toBeUndefined();
    });

    describe('forceNow', function () {
      it('should throw an Error if passed an invalid date', function () {
        expect(() =>
          parseDateMath('now', { forceNow: new Date('foobar') }),
        ).toThrowError();
      });
    });
  });

  describe('objects and strings', function () {
    let mmnt: Date;
    let date: Date;
    let now: Date;

    beforeEach(function () {
      jest.useFakeTimers('modern');
      jest.setSystemTime(unix);
      now = new Date();
      mmnt = new Date(anchoredDate);
      date = new Date(mmnt);
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    it('should return a Date if passed an ISO8601 string', function () {
      expect(parseDateMath(anchor).getTime()).toEqual(mmnt.getTime());
    });

    it('should return the current time when parsing now', function () {
      expect(parseDateMath('now').getTime()).toEqual(now.getTime());
    });

    it('should use the forceNow parameter when parsing now', function () {
      expect(
        parseDateMath('now', { forceNow: anchoredDate }).valueOf(),
      ).toEqual(unix);
    });
  });

  describe('subtraction', function () {
    let now: Date;
    let anchored: Date;

    beforeEach(function () {
      jest.useFakeTimers('modern');
      jest.setSystemTime(unix);
      now = new Date();
      anchored = new Date(anchor);
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    [5, 12, 247].forEach((len) => {
      spans.forEach((span) => {
        const nowEx = `now-${len}${span}`;
        const thenEx = `${anchor}||-${len}${span}`;

        it(`should return ${len}${span} ago`, function () {
          const parsed = parseDateMath(nowEx).valueOf();
          expect(parsed).toEqual(subtract(now, len, span).valueOf());
        });

        it(`should return ${len}${span} before ${anchor}`, function () {
          const parsed = parseDateMath(thenEx).valueOf();
          expect(parsed).toEqual(subtract(anchored, len, span).valueOf());
        });

        it(`should return ${len}${span} before forceNow`, function () {
          const parsed = parseDateMath(nowEx, {
            forceNow: anchoredDate,
          }).valueOf();
          const expected = subtract(anchored, len, span);
          expect(parsed).toEqual(expected.valueOf());
        });
      });
    });
  });

  describe('addition', function () {
    let now: Date;
    let anchored: Date;

    beforeEach(function () {
      jest.useFakeTimers('modern');
      jest.setSystemTime(unix);
      now = new Date();
      anchored = new Date(anchor);
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    [5, 12, 247].forEach((len) => {
      spans.forEach((span) => {
        const nowEx = `now+${len}${span}`;
        const thenEx = `${anchor}||+${len}${span}`;

        it(`should return ${len}${span} from now`, function () {
          expect(parseDateMath(nowEx).valueOf()).toEqual(
            add(now, len, span).valueOf(),
          );
        });

        it(`should return ${len}${span} after ${anchor}`, function () {
          expect(parseDateMath(thenEx).valueOf()).toEqual(
            add(anchored, len, span).valueOf(),
          );
        });

        it(`should return ${len}${span} after forceNow`, function () {
          expect(
            parseDateMath(nowEx, { forceNow: anchoredDate }).valueOf(),
          ).toEqual(add(anchored, len, span).valueOf());
        });
      });
    });
  });

  describe('rounding', function () {
    let now: Date;
    let anchored;

    beforeEach(function () {
      jest.useFakeTimers('modern');
      jest.setSystemTime(unix);
      now = new Date();
      anchored = new Date(anchor);
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    spans.forEach((span) => {
      it(`should round now to the beginning of the ${span}`, function () {
        expect(parseDateMath(`now/${span}`).valueOf()).toEqual(
          startOf(now, span).valueOf(),
        );
      });

      it(`should round now to the beginning of forceNow's ${span}`, function () {
        expect(
          parseDateMath(`now/${span}`, { forceNow: anchoredDate }).valueOf(),
        ).toEqual(startOf(anchored, span).valueOf());
      });

      it(`should round now to the end of the ${span}`, function () {
        expect(
          parseDateMath(`now/${span}`, { roundUp: true }).valueOf(),
        ).toEqual(endOf(now, span).valueOf());
      });

      it(`should round now to the end of forceNow's ${span}`, function () {
        expect(
          parseDateMath(`now/${span}`, {
            roundUp: true,
            forceNow: anchoredDate,
          }).valueOf(),
        ).toEqual(endOf(anchored, span).valueOf());
      });
    });
  });

  describe('math and rounding', function () {
    let now: Date;
    let anchored: Date;

    beforeEach(function () {
      jest.useFakeTimers('modern');
      jest.setSystemTime(unix);
      now = new Date();
      anchored = new Date(anchor);
    });

    afterEach(function () {
      jest.useRealTimers();
    });

    it('should round to the nearest second with 0 value', function () {
      const val = parseDateMath('now-0s/s').valueOf();
      expect(val).toEqual(startOf(now, 's').valueOf());
    });

    it('should subtract 17s, rounded to the nearest second', function () {
      const val = parseDateMath('now-17s/s').valueOf();
      const start = startOf(now, 's');
      const expected = subtract(start, 17, 's');
      expect(val).toEqual(expected.valueOf());
    });

    it('should add 555ms, rounded to the nearest millisecond', function () {
      const val = parseDateMath('now+555ms/ms').valueOf();
      const added = add(now, 555, 'ms');
      const expected = startOf(added, 'ms');
      expect(val).toEqual(expected.valueOf());
    });

    it('should subtract 555ms, rounded to the nearest second', function () {
      const val = parseDateMath('now-555ms/s').valueOf();
      const subtracted = subtract(now, 555, 'ms');
      const expected = startOf(subtracted, 's');
      expect(val).toEqual(expected.valueOf());
    });

    it('should round relative to forceNow', function () {
      const val = parseDateMath('now-0s/s', {
        forceNow: anchoredDate,
      }).valueOf();
      const expected = startOf(anchored, 's');
      expect(val).toEqual(expected.valueOf());
    });

    it('should parse long expr', () => {
      expect(parseDateMath('now-1d/d+8h+50m')).toBeTruthy();
    });
  });

  describe('units', function () {
    it('should have units descending for unitsDesc', function () {
      expect(unitsDesc).toEqual(['y', 'M', 'w', 'd', 'h', 'm', 's', 'ms']);
    });

    it('should have units ascending for unitsAsc', function () {
      expect(unitsAsc).toEqual(['ms', 's', 'm', 'h', 'd', 'w', 'M', 'y']);
    });
  });
});
