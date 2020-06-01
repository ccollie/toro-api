import {
  SlidingTimeWindowArrayReservoir
} from '../../../../src/server/metrics/lib';
import { ManualClock } from '../../../../src/server/lib';
import random from 'lodash/random';

describe('SlidingTimeWindowArrayReservoir', () => {

  describe('.firstKey', () => {
    it('returns the first key', () => {
      const clock = new ManualClock();
      const first = clock.getTime();
      const reservoir = new SlidingTimeWindowArrayReservoir(10, clock);
      for (let i = 0; i < 10; i++) {
        reservoir.update( random(10, 1000) );
        clock.advanceBy(10);
      }

      expect(reservoir.firstKey).toBe(first);
    });

    it('should return undefined for an empty list', () => {
      const clock = new ManualClock();
      const reservoir = new SlidingTimeWindowArrayReservoir(10, clock);
      expect(reservoir.firstKey).toBeUndefined();
    });
  });

  describe('.lastKey', () => {
    it('returns the last key', () => {
      const clock = new ManualClock();
      const reservoir = new SlidingTimeWindowArrayReservoir(10, clock);
      for (let i = 0; i < 10; i++) {
        reservoir.update( random() );
        clock.advanceBy(10);
      }
      expect(reservoir.lastKey).toBe(clock.getTime());

    });

    it('should return undefined for an empty list', () => {
      const clock = new ManualClock();
      const reservoir = new SlidingTimeWindowArrayReservoir(10, clock);
      expect(reservoir.lastKey).toBeUndefined();
    });
  });

  describe('.update', () => {
    it('bounds values to the window', () => {
      const clock = new ManualClock(0);
      const reservoir = new SlidingTimeWindowArrayReservoir(10, clock);

      reservoir.update(1);

      clock.set(5);
      reservoir.update(2);

      clock.set(10);
      reservoir.update(3);

      clock.set(15);
      reservoir.update(4);

      clock.set(20);
      reservoir.update(5);

      const actual = reservoir.getValues();
      expect(actual).toStrictEqual([4, 5]);
    });
  });
});
