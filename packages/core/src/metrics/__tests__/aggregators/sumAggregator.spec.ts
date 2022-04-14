import { LatencyMetric, SumAggregator } from '../../';
import { AggregatorTypes } from '../../../types';
import { random } from '@alpen/shared';
import { validateCounts } from './helpers';

describe('SumAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(SumAggregator.key).toBe(AggregatorTypes.Sum);
    });

    it('exposes a description', () => {
      expect(SumAggregator.description).toBe('Sum');
    });

    it('exposes a schema', () => {
      expect(SumAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new SumAggregator({
      duration: 10000,
    });

    expect(instance).toBeDefined();
  });

  describe('update', () => {
    let timestamps: number[] = [];
    let values: number[] = [];

    beforeEach(() => {
      timestamps = [];
      values = [];
    });

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

    it('upgrades without tick', () => {
      const instance = new SumAggregator({
        duration: 5000,
      });
      let sum = 0;

      const sliceCount = Math.floor(instance.windowSize / instance.granularity);
      const start = 1000;

      for (let i = 0; i < sliceCount - 1; i++) {
        const value = random(1, 1000);
        sum += value;
        const actual = instance.update(value, start + i * instance.granularity);
        expect(actual).toBe(sum);
      }
    });

    it('updates on tick', () => {
      const instance = new SumAggregator({
        duration: 1000,
      });

      // enough so we rotate
      const sliceCount =
        Math.floor(instance.windowSize / instance.granularity) * 2 + 1;

      let sum = 0;
      let timeStamp = 1000;
      let lastTick = instance.lastTick;
      for (let i = 0; i < sliceCount; i++) {
        const num = 10 + i * 10;
        const value = instance.update(num, timeStamp);

        if (!lastTick) lastTick = instance.lastTick;
        if (lastTick !== instance.lastTick) {
          lastTick = instance.lastTick;
          trim(instance.currentWindowStart);
          sum = values.reduce((acc, num) => acc + num, 0);
        }

        pushValue(timeStamp, num);

        sum = sum + num;

        expect(value).toBe(sum);
        timeStamp += instance.granularity;
      }
    });
  });

  describe('count', () => {
    it('maintains a proper count', () => {
      const instance = new SumAggregator({
        duration: 5000,
      });

      validateCounts(instance);
    });
  });

  describe('getDescription', () => {
    let instance: SumAggregator;

    beforeEach(() => {
      instance = new SumAggregator({
        duration: 5000,
      });
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('sum(Latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency sum');
    });
  });
});
