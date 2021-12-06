import { systemClock, ManualClock } from '../../lib';
import { SlidingWindowCounter } from '../';

describe('SlidingWindowCounter', () => {
  describe('Constructor', () => {
    test('It should properly construct according to options', () => {
      const counter = new SlidingWindowCounter(systemClock, 10000);
      expect(counter.duration).toBe(10000);
    });
  });

  describe('Adding', () => {
    test('it can add', () => {
      const counter = new SlidingWindowCounter(systemClock, 10000);
      counter.incr('success', 1);
      counter.incr('success', 2);
      counter.incr('success', 3);
      const response = counter.get('success');

      expect(response).toBe(6);
    });
  });

  describe('windowing', () => {
    let counter: SlidingWindowCounter;
    let clock: ManualClock;

    beforeEach(() => {
      clock = new ManualClock(0);
      counter = new SlidingWindowCounter(clock, 5000);
    });

    it('increments and wraps buckets correctly', () => {
      for (let i = 0; i < 7; i++) {
        for (let k = 0; k < i; k++) {
          counter.incr('failure');
          counter.incr('success');
          counter.incr('success');
        }

        clock.advanceBy(counter.interval);
      }

      const failures = counter.get('failure');
      const successes = counter.get('success');

      expect(failures).toBe(20);
      expect(successes).toBe(40);

      // expect(getState(b).windows).to.deep.equal([
      //     { failures: 5, successes: 10, startedAt: 5000 },
      //     { failures: 6, successes: 12, startedAt: 6000 },
      //     { failures: 2, successes: 4, startedAt: 2000 },
      //     { failures: 3, successes: 6, startedAt: 3000 },
      //     { failures: 4, successes: 8, startedAt: 4000 },
      // ]);
    });
  });
});
