import { advanceBy, clear } from 'jest-date-mock';
import { SlidingWindowCounter } from '../../../src/server/monitor/lib';

describe('SlidingWindowCounter', () => {
  describe('Constructor', () => {
    test('It should properly construct according to options', () => {
      const counter = new SlidingWindowCounter({
        duration: 10000,
        period: 1000,
      });
      expect(counter.duration).toBe(10000);
      expect(counter.period).toBe(1000);
    });
  });

  describe('Adding', () => {
    test('it can add', () => {
      const counter = new SlidingWindowCounter({
        duration: 10000,
        period: 1000,
      });

      counter.incr('success', 1);
      counter.incr('success', 2);
      counter.incr('success', 3);
      const response = counter.get('success');

      expect(response).toBe(6);
    });
  });

  describe('windowing', () => {
    let b;

    jest.useFakeTimers();

    beforeEach(() => {
      b = new SlidingWindowCounter({ duration: 5000, period: 1000 });
    });

    afterEach(() => {
      clear();
    });

    it('increments and wraps buckets correctly', () => {
      const start = 5000;

      for (let i = 0; i < 7; i++) {
        for (let k = 0; k < i; k++) {
          b.incr('failure');
          b.incr('success');
          b.incr('success');
        }

        advanceBy(1000);
      }

      // const dump = b.dump();
      // console.log(dump);

      const failures = b.get('failure');
      const successes = b.get('success');

      console.log(b.windows);

      expect(failures).toBe(20);
      expect(successes).toBe(40);
      expect(b.currentWindow).toBe(1);

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
