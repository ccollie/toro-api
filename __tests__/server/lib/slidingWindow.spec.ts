/* global test, expect */
import ms from 'ms';
import { advanceBy, clear } from 'jest-date-mock';
import { SlidingWindow } from '../../../src/server/monitor/lib';

const defaultWindowOpts = {
  duration: 2 * 60 * 1000,
  period: 10 * 1000,
};

describe('SlidingWindow', () => {
  describe('constructor', () => {
    test('It should create a SlidingWindow', () => {
      const subject = new SlidingWindow(defaultWindowOpts);
      expect(subject.duration).not.toBeUndefined();
      expect(subject.period).not.toBeUndefined();
      subject.destroy();
    });

    test('It should properly construct according to options', () => {
      const subject = new SlidingWindow({
        duration: 10000,
        period: 1000,
      });
      expect(subject.duration).toBe(10000);
      expect(subject.period).toBe(1000);
      expect(subject.length).toBe(Math.ceil(subject.duration / subject.period));
    });

    test('It fills window slices with default values', () => {
      const subject = new SlidingWindow(
        {
          duration: 10000,
          period: 100,
        },
        99,
      );
      subject.forEach((value) => {
        expect(value).toBe(99);
      });
    });

    test('default value can be a function', () => {
      const subject = new SlidingWindow(defaultWindowOpts, () => 99);
      subject.forEach((value) => {
        expect(value).toBe(99);
      });
    });
  });
});
