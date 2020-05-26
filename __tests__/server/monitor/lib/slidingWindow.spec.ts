/* global test, expect */
import { advanceBy, advanceTo, clear } from 'jest-date-mock';
import { random } from 'lodash';
import { SlidingWindow } from '../../../../src/server/monitor/lib';

const defaultWindowOpts = {
  duration: 30000,
  period: 1000,
};

describe('SlidingWindow', () => {
  describe('constructor', () => {
    test('should construct with a window spec', () => {
      const subject = new SlidingWindow(defaultWindowOpts);

      expect(subject.period).toBeDefined();
      expect(subject.duration).toBeDefined();
      expect(subject.capacity).toBeGreaterThan(0);
    });

    test('it accepts a default value', () => {
      const value = random(1, 99);
      const subject = new SlidingWindow(defaultWindowOpts, value);

      subject.forEach((val) => {
        expect(val).toBe(value);
      });
    });

    test('it accepts a function as default value', () => {
      const value = random(10, 100);
      const defaultValue = () => value;

      const subject = new SlidingWindow(defaultWindowOpts, defaultValue);

      subject.forEach((val) => {
        expect(val).toBe(value);
      });
    });
  });

  describe('windowing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.clearAllTimers();
      clear();
    });

    function advanceTimer(ms): void {
      advanceBy(ms);
      jest.advanceTimersByTime(ms);
    }

    test('it raises a "tick" event on window rotation', () => {
      let index = 0;
      const defaultValue = () => index++;
      const subject = new SlidingWindow(
        {
          duration: 30000,
          period: 1000,
        },
        defaultValue,
      );

      let tickCount = 0;
      const tickHandler = (data) => {
        tickCount++;
        const { popped, current, start } = data;
      };

      subject.on('tick', tickHandler);

      for (let i = 0; i < 30; i++) {
        advanceTimer(1000);
      }
      jest.runOnlyPendingTimers();

      expect(tickCount).toBe(30);
    });

    test('it rotates window slices', () => {
      let index = 0;
      const defaultValue = () => index++;
      const subject = new SlidingWindow(
        {
          duration: 30000,
          period: 1000,
        },
        defaultValue,
      );

      for (let i = 0; i < 30; i++) {}
    });
  });
});
