/* global test, expect */
import { random } from 'lodash';
import { SlidingWindow } from '../../../../src/server/metrics/lib';
import { systemClock, ManualClock } from '../../../../src/server/lib';
import { rand } from '../../../../src/example/processors/utils';

const defaultWindowSize = 30000;

describe('SlidingWindow', () => {
  describe('constructor', () => {
    test('should construct with a window spec', () => {
      const subject = new SlidingWindow(systemClock, defaultWindowSize);

      expect(subject.interval).toBeDefined();
      expect(subject.duration).toBeDefined();
      expect(subject.capacity).toBeGreaterThan(0);
    });

    test('it accepts a default value', () => {
      const value = random(1, 99);
      const subject = new SlidingWindow(systemClock, defaultWindowSize, value);

      subject.forEach((val) => {
        expect(val).toBe(value);
      });
    });

    test('it accepts a function as default value', () => {
      const value = random(10, 100);
      const defaultValue = () => value;

      const subject = new SlidingWindow(systemClock, defaultWindowSize, defaultValue);

      subject.forEach((val) => {
        expect(val).toBe(value);
      });
    });
  });

  describe('get', () => {
    let clock;
    let subject: SlidingWindow<number>;

    beforeEach(() => {
      clock = new ManualClock(0);
      let index = 0;
      const defaultValue = () => (index++) * 10;
      subject = new SlidingWindow<number>(clock, 30000, defaultValue);
    });

    it('can get items by index', () => {
      for (let i = 0; i < subject.length; i++) {
        const val = subject.get(i);
        const expected = i * 10;
        expect(val).toBe(expected);
      }
    });

    it('can get items by negative index', () => {
      let j = -1;
      const len = subject.length;
      for (let i = 0; i < len; i++) {
        const val = subject.get(j - i);
        const expected = subject.get(len - i - 1);
        expect(val).toBe(expected);
      }
    });

    it('index is relative to ticks', () => {
      // shift by 2
      clock.set(2000);
      for (let i = 0; i < subject.length; i++) {
        const val = subject.get(i);
        const expected = ((i + 2) % subject.length) * 10;
        expect(val).toBe(expected);
      }
    });

    it('out of range indexes returned undefined', () => {
      const index = subject.length + 1;
      expect(subject.get(index)).toBeUndefined();
      expect(subject.get(-index)).toBeUndefined();
    })

  });

  describe('set', () => {
    let clock;
    let subject: SlidingWindow<number>;

    beforeEach(() => {
      clock = new ManualClock(0);
      let index = 0;
      const defaultValue = () => index++;
      subject = new SlidingWindow<number>(clock, 20000, defaultValue);
    });

    it('should set the value at an index', () => {
      let v = subject.set(1, 22);
      expect(v).toBe(22);
      v = subject.get(1);
      expect(v).toBe(22);
      v = subject.set(-1, 999);
      expect(v).toBe(999);
      expect(subject.get(subject.length - 1)).toBe(v);
    });

    it('should not set the value at an out-of-bounds index', () => {
      const len = subject.length;
      let v = subject.set(len, 22);
      expect(v).toBeUndefined();
    });
  });

  describe('windowing', () => {

    test('it raises a "tick" event on window rotation', () => {
      let index = 0;
      const clock = new ManualClock(0);
      const defaultValue = () => index++;
      const subject = new SlidingWindow<number>(clock, 30000, defaultValue);

      let tickCount = 0;
      const tickHandler = (data) => {
        tickCount++;
      };

      subject.onTick(tickHandler);

      clock.set(30001);

      subject.tickIfNeeded();
      expect(tickCount).toBe(30);
    });

    test('it rotates window slices', () => {
      let index = 0;
      const defaultValue = () => index++;
      const clock = new ManualClock(0);
      const subject = new SlidingWindow<number>(clock, 30000, defaultValue);

      for (let i = 0; i < 30; i++) {
        const val = subject.current;
        expect(val).toBe(i);
        clock.advanceBy(1001);
      }
    });
  });

  describe('iterator', () => {

    it('can iterate slices in the window', () => {
      const clock = new ManualClock(0);
      let val = 0;
      const values = [];
      for (let i = 0; i < 20; i++) {
        val = val + rand(1, 50);
        values.push(val);
      }
      let index = 0;
      const subject = new SlidingWindow<number>(clock, 20000,() => values[index++]);

      let count = 0;
      // don't assume order of iteration, check using a set instead
      const used = new Set(values);
      for (let data of subject) {
        count++;
        expect(used.has(data)).toBe(true);
        used.delete(data);
      }
      expect(count).toBe(subject.length);
      expect(used.size).toBe(0);
    });

  });

  describe('forEach', () => {
    let clock;
    let values: number[];
    let subject: SlidingWindow<number>;

    beforeEach(() => {
      clock = new ManualClock(0);
      let val = 0;
      values = [];
      for (let i = 0; i < 20; i++) {
        val = val + rand(1, 50);
        values.push(val);
      }
      let index = 0;
      subject = new SlidingWindow<number>(clock, 20000, () => values[index++]);
    });

    it('can iterate slices in the window', () => {
      let count = 0;
      // don't assume order of iteration, check using a set instead
      const used = new Set(values);
      subject.forEach((data, index) => {
        count++;
        expect(used.has(data)).toBe(true);
        used.delete(data);
      });
      expect(count).toBe(subject.length);
      expect(used.size).toBe(0);
    });

    it('halts iteration if the callback returns false', () => {
      let count = 0;
      // don't assume order of iteration, check using a set instead
      subject.forEach((data, index) => {
        count++;
        return false;
      });
      expect(count).toBe(1);
    });

  });

  describe('current', () => {
    let clock: ManualClock;
    let start: number;
    let subject: SlidingWindow<number>;

    beforeEach(() => {
      clock = new ManualClock(0);
      start = rand(10, 1000);
      let index = start;
      subject = new SlidingWindow<number>(clock, 10000, () => index++);
    });

    it('can get the current slice', () => {
      let val = subject.current;
      expect(val).toBe(start);
    });

    it('can set the current slice', () => {
      const expected = rand(10, 1000);
      subject.current = expected;
      expect(subject.current).toBe(expected);
    });

    it('respects the clock', () => {
      for (let i = 0; i < subject.length; i++) {
        const val = subject.current;
        expect(val).toBe(start + i);
        clock.advanceBy(1001);
      }
    });

    it('should wrap around', () => {
      const expected = subject.current;
      clock.advanceBy(subject.length * 1000 + 1);
      const val = subject.current;
      expect(val).toBe(expected);
    });

  });
});