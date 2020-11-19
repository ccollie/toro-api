import {
  RealTimePeakDetector,
} from '../../../../src/server/metrics/lib';
import { ManualClock, systemClock } from '../../../../src/server/lib';


describe('RealTimePeakDetector', () => {

  describe('constructor', () => {

    it('constructs an instance', () => {
      let sut = new RealTimePeakDetector(systemClock, 1000, 3.5, 0);
      expect(sut).toBeDefined();
      expect(sut.threshold).toBe(3.5);
      expect(sut.influence).toBe(0);
      expect(sut.lag).toBe(1000);
    });

  });

  describe('.isInLagPeriod', () => {
    it('calculates correctly', () => {
      const clock = new ManualClock();
      let sut = new RealTimePeakDetector(clock, 1000, 3.5, 0);
      for (let i = 0; i < 10; i++) {
        expect(sut.isInLagPeriod).toBe(true);
        clock.advanceBy(100);
      }
      expect(sut.isInLagPeriod).toBe(false);
    });
  });

  describe('.update', () => {

    it('does not signal on a single value', () => {
      const clock = new ManualClock();
      let sut = new RealTimePeakDetector(clock, 0, 3.5, 0);
      const signal = sut.update(20000);
      expect(signal).toBe(0);
    });

    it('calculates peaks', () => {

      let testData:number[] = [1,1,1.1,1,0.9,1,1,1.1,1,0.9,1,1.1,1,1,0.9,1,1,1.1,1,1,1,1,1.1,0.9,1,1.1,1,1,0.9,
        1,1.1,1,1,1.1,1,0.8,0.9,1,1.2,0.9,1,1,1.1,1.2,1,1.5,1,3,2,5,3,2,1,1,1,0.9,1,1,3,
        2.6,4,3,3.2,2,1,1,0.8,4,4,2,2.5,1,1,1];

      //results from original implementation
      let knownResults:number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1,
        1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1,
        1, 1, 1, 0, 0, 0]

      const clock = new ManualClock();

      let sut = new RealTimePeakDetector(clock, 30, 5, 0);
      let actual: number[] = [];
      testData.forEach((value, index) => {
        if (index === 29) {
          // emulate exiting lag
          clock.advanceBy(30);
        }
        const signal = sut.update(value);
        actual.push(signal);
      });
      expect(actual).toStrictEqual(knownResults);
    });
  });

});
