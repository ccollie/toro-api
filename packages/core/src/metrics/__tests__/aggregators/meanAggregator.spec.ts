import {
  AggregatorTypes,
  LatencyMetric,
  MeanAggregator,
} from '../../';
import { random } from '@alpen/shared';
import { validateCounts } from './helpers';

describe('MeanAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(MeanAggregator.key).toBe(AggregatorTypes.Mean);
    });

    it('exposes a description', () => {
      expect(MeanAggregator.description).toBe('Average');
    });

    it('exposes a schema', () => {
      expect(MeanAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new MeanAggregator({
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

    function getAverage() {
      const len = values.length;
      const sum = values.reduce((acc, value) => acc + value, 0);
      return len ? sum / len : 0;
    }

    it('upgrades without tick', () => {
      const instance = new MeanAggregator({
        duration: 5000,
      });
      const sliceCount = Math.floor(instance.windowSize / instance.granularity);
      const start = 1000;

      for (let i = 0; i < sliceCount - 1; i++) {
        const value = random(1, 1000);
        const ts = start + i * instance.granularity;
        const actual = instance.update(value, ts);
        pushValue(ts, value);

        const expected = getAverage();
        expect(actual).toBeCloseTo(expected, 3);
      }
      expect(instance.count).toBe(sliceCount - 1);
    });

    it('updates on tick', () => {
      const instance = new MeanAggregator({
        duration: 1000,
      });

      // enough so we rotate
      const sliceCount =
        Math.floor(instance.windowSize / instance.granularity) * 2 + 1;

      let timeStamp = 1000;
      let lastTick = instance.lastTick;
      for (let i = 0; i < sliceCount; i++) {
        const num = random(1, 100);
        const value = instance.update(num, timeStamp);

        if (!lastTick) lastTick = instance.lastTick;
        if (lastTick !== instance.lastTick) {
          lastTick = instance.lastTick;
          trim(instance.currentWindowStart);
        }
        pushValue(timeStamp, num);

        const avg = getAverage();

        expect(value).toBeCloseTo(avg, 3);
        expect(instance.count).toBe(values.length);
        timeStamp += instance.granularity;
      }
    });
  });

  describe('count', () => {
    it('maintains a proper count', () => {
      const instance = new MeanAggregator({
        duration: 5000,
      });

      validateCounts(instance);
    });
  });

  describe('getDescription', () => {
    let instance: MeanAggregator;

    beforeEach(() => {
      instance = new MeanAggregator({
        duration: 5000,
      });
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('avg(Latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency average');
    });
  });
});
