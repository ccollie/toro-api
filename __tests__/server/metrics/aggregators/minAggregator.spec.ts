import { LatencyMetric, MinAggregator } from '@src/server/metrics';
import random from 'lodash/random';
import { AggregatorTypes } from '@src/types';
import { validateCounts } from './helpers';

describe('MinAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(MinAggregator.key).toBe(AggregatorTypes.Min);
    });

    it('exposes a description', () => {
      expect(MinAggregator.description).toBe('Minimum');
    });

    it('exposes a schema', () => {
      expect(MinAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new MinAggregator({
      duration: 10000,
    });

    expect(instance).toBeDefined();
  });

  describe('update', () => {
    it('upgrades without tick', () => {
      const instance = new MinAggregator({
        duration: 5000,
      });
      let min = Number.MAX_SAFE_INTEGER;
      for (let i = 0; i < 100; i++) {
        const value = random(1, 1000);
        min = Math.min(value, min);
        const actual = instance.update(value);
        expect(actual).toBe(min);
      }
    });

    it('updates on tick', () => {
      let timestamps: number[] = [];
      let values: number[] = [];

      function pushValue(ts: number, value: number) {
        timestamps.push(ts);
        values.push(value);
      }

      function trim(startTs: number) {
        const stamps = [];
        const nums = [];
        timestamps.forEach((ts, index) => {
          if (ts >= startTs) {
            stamps.push(ts);
            nums.push(values[index]);
          }
        });
        timestamps = stamps;
        values = nums;
      }

      const instance = new MinAggregator({
        duration: 2000,
      });

      // enough so we rotate
      const sliceCount =
        Math.floor(instance.windowSize / instance.granularity) * 2 + 1;

      let min = Number.MAX_SAFE_INTEGER;
      let timeStamp = 1000;
      let lastTick = instance.lastTick;
      for (let i = 0; i < sliceCount; i++) {
        const num = random(-100, 2500);
        const value = instance.update(num, timeStamp);

        if (!lastTick) lastTick = instance.lastTick;
        if (lastTick !== instance.lastTick) {
          lastTick = instance.lastTick;
          trim(instance.currentWindowStart);
          min = Math.min(...values);
        }

        pushValue(timeStamp, num);

        min = Math.min(min, num);

        expect(value).toBe(min);
        timeStamp += instance.granularity;
      }
    });
  });

  describe('count', () => {
    it('maintains a proper count', () => {
      const instance = new MinAggregator({
        duration: 5000,
      });

      validateCounts(instance);
    });
  });

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      instance = new MinAggregator({
        duration: 5000,
      });
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('min(Latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency min');
    });
  });
});
