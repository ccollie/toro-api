import { LatencyMetric, StandardDeviationAggregator } from '../../';
import { random } from 'lodash';
import { OnlineNormalEstimator } from '../../../stats/online-normal-estimator';
import { AggregatorTypes } from '../../types';
import { validateCounts } from './helpers';

describe('StandardDeviationAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(StandardDeviationAggregator.key).toBe(AggregatorTypes.StdDev);
    });

    it('exposes a description', () => {
      expect(StandardDeviationAggregator.description).toBe('Std Deviation');
    });

    it('exposes a schema', () => {
      expect(StandardDeviationAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new StandardDeviationAggregator({
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

    function getStandardDeviation(): number {
      const estimator = new OnlineNormalEstimator();
      estimator.addAll(values);
      return estimator.standardDeviation;
    }

    it('upgrades without tick', () => {
      const instance = new StandardDeviationAggregator({
        duration: 5000,
      });
      const sliceCount = Math.floor(instance.windowSize / instance.granularity);
      const start = 1000;

      for (let i = 0; i < sliceCount - 1; i++) {
        const value = random(1, 1000);
        const ts = start + i * instance.granularity;
        const actual = instance.update(value, ts);
        pushValue(ts, value);

        const expected = getStandardDeviation();
        expect(actual).toBeCloseTo(expected, 3);
      }
      expect(instance.count).toBe(sliceCount - 1);
    });

    it('updates on tick', () => {
      const instance = new StandardDeviationAggregator({
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

        const std = getStandardDeviation();

        expect(value).toBeCloseTo(std, 3);
        expect(instance.count).toBe(values.length);
        timeStamp += instance.granularity;
      }
    });
  });

  describe('count', () => {
    it('maintains a proper count', () => {
      const instance = new StandardDeviationAggregator({
        duration: 5000,
      });

      validateCounts(instance);
    });
  });

  describe('getDescription', () => {
    let instance: StandardDeviationAggregator;

    beforeEach(() => {
      instance = new StandardDeviationAggregator({
        duration: 5000,
      });
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('std_dev(Latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency std deviation');
    });
  });
});
