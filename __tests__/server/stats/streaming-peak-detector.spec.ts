import { ManualClock } from '@src/server/lib';
import { StreamingPeakDetector } from '@src/server/stats';

describe('StreamingPeakDetector', () => {
  describe('constructor', () => {
    it('constructs an instance', () => {
      const sut = new StreamingPeakDetector(1000, 3.5, 0);
      expect(sut).toBeDefined();
      expect(sut.threshold).toBe(3.5);
      expect(sut.influence).toBe(0);
      expect(sut.lag).toBe(1000);
    });
  });

  describe('.isInLagPeriod', () => {
    it('calculates correctly', () => {
      const clock = new ManualClock();
      const sut = new StreamingPeakDetector(1000, 3.5, 0);
      for (let i = 0; i < 10; i++) {
        sut.update(i, clock.getTime());
        expect(sut.isInLagPeriod).toBe(true);
        clock.advanceBy(100);
      }
      sut.update(100, clock.getTime());
      expect(sut.isInLagPeriod).toBe(false);
    });
  });

  describe('.update', () => {
    it('does not signal on a single value', () => {
      const sut = new StreamingPeakDetector(0, 3.5, 0);
      const signal = sut.update(20000);
      expect(signal).toBe(0);
    });

    it('calculates peaks', () => {
      const testData: number[] = [
        1, 1, 1.1, 1, 0.9, 1, 1, 1.1, 1, 0.9, 1, 1.1, 1, 1, 0.9, 1, 1, 1.1, 1,
        1, 1, 1, 1.1, 0.9, 1, 1.1, 1, 1, 0.9, 1, 1.1, 1, 1, 1.1, 1, 0.8, 0.9, 1,
        1.2, 0.9, 1, 1, 1.1, 1.2, 1, 1.5, 1, 3, 2, 5, 3, 2, 1, 1, 1, 0.9, 1, 1,
        3, 2.6, 4, 3, 3.2, 2, 1, 1, 0.8, 4, 4, 2, 2.5, 1, 1, 1,
      ];

      //results from original implementation
      const knownResults: number[] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0,
        0, 0,
      ];

      const clock = new ManualClock();

      const sut = new StreamingPeakDetector(30, 5, 0);
      const actual: number[] = [];
      testData.forEach((value, index) => {
        if (index === 29) {
          // emulate exiting lag
          clock.advanceBy(30);
        }
        const signal = sut.update(value, clock.getTime());
        actual.push(signal);
      });
      expect(actual).toStrictEqual(knownResults);
    });
  });
});
