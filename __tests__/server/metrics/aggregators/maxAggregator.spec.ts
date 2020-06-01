import { MaxAggregator } from '../../../../src/server/metrics/aggregators';
import { systemClock, ManualClock } from '../../../../src/server/lib';
import { LatencyMetric } from '../../../../src/server/metrics';
import random from 'lodash/random';
import { getRandomIntArray } from '../../utils';

describe('MaxAggregator', () => {
  it('can construct an instance', () => {
    const instance = new MaxAggregator(systemClock, {
      duration: 10000,
    });

    expect(instance).toBeDefined();
  })

  describe('update', () => {

    it('upgrades without tick', () => {
      const clock = new ManualClock(0);

      const instance = new MaxAggregator(clock, {
        duration: 5000,
      });
      let value = instance.update(1);
      expect(value).toBe(1);
      value = instance.update(40);
      expect(value).toBe(40);
      value = instance.update(5);
      expect(value).toBe(40);
    });

    it('updates with tick', () => {
      const clock = new ManualClock(0);

      const instance = new MaxAggregator(clock, {
        duration: 3000
      });
      let value = instance.update(40);
      expect(value).toBe(40);
      clock.advanceBy(instance.interval);
      value = instance.update(20);
      expect(value).toBe(40);

      clock.advanceBy(instance.interval);
      value = instance.update(30);
      expect(value).toBe(40);

      clock.advanceBy(instance.interval);
      value = instance.update(10);
      expect(value).toBe(30);

    });

  });

  describe('count', () => {
    let instance: MaxAggregator;
    let clock: ManualClock;
    let total: number;

    beforeEach(() => {
      clock = new ManualClock(0);
      instance = new MaxAggregator(clock, {
        duration: 5000
      });
      total = 0;
    });

    function update(count: number): void {
      for (let i = 0; i < count; i++) {
        const value = random(0, 99);
        instance.update(value);
      }
      total += count;
    }

    it('maintains a proper count', () => {
      const count = random(5, 50);
      update(count);
      expect(instance.count).toBe(count);
    });

    it('updates counts on tick', () => {

      const numberSlices: Array<number[]> = [];

      const getCount = () => {
        return numberSlices.reduce((count, slice) => count + slice.length, 0);
      };

      const getMax = () => {
        return numberSlices.reduce((max, slice) => Math.max(max, ...slice), Number.NEGATIVE_INFINITY);
      }

      const sliceCount = instance.sliceCount;
      const tickSpy = jest.spyOn(instance, 'onTick');

      for (let i = 0; i < sliceCount; i++) {
        let count = random(5, 100);
        const slice = getRandomIntArray(count);
        numberSlices.push(slice);
        slice.forEach(x => instance.update(x));
        clock.advanceBy(instance.interval);
      }

      expect(tickSpy).toHaveBeenCalledTimes(sliceCount - 1);
      let max = getMax();
      let count = getCount();

      // at this point, we'll be rotating
      for (let i = 0; i < sliceCount; i++) {
        numberSlices.shift();
        max = getMax();
        count = getCount();
        const val = instance.value;
        expect(val).toBe(max);
        expect(instance.count).toBe(count);
        clock.advanceBy(instance.interval);
      }

    });
  });

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      const clock = new ManualClock(0);
      instance = new MaxAggregator(clock, {
        duration: 5000
      });
    })

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('max(latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('latency max');
    });
  });
});
