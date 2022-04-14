import { LatencyMetric } from '../../';
import { AggregatorTypes } from '../../../types';
import {
  P75Aggregator,
  P90Aggregator,
  P95Aggregator,
  P995Aggregator,
  QuantileAggregator,
} from '../../aggregators';

import { random } from '@alpen/shared';
import { DDSketch } from '@datadog/sketches-js';
import { validateCounts } from './helpers';

describe('Quantile Aggregators', () => {
  describe('QuantileAggregator', () => {
    describe('static properties', () => {
      it('has the correct "key" property', () => {
        expect(QuantileAggregator.key).toBe(AggregatorTypes.Quantile);
      });

      it('exposes a description', () => {
        expect(QuantileAggregator.description).toBe('Quantile');
      });

      it('exposes a schema', () => {
        expect(QuantileAggregator.schema).toBeDefined();
      });
    });

    it('can construct an instance', () => {
      const instance = new QuantileAggregator({
        duration: 10000,
        quantile: 0.5,
        alpha: 0.01,
      });

      expect(instance).toBeDefined();
      expect(instance.windowSize).toBe(10000);
      expect(instance.quantile).toBe(0.5);
      expect(instance.alpha).toBe(0.01);
    });

    describe('update', () => {
      it('upgrades without tick', () => {
        const instance = new QuantileAggregator({
          duration: 5000,
          quantile: 0.9,
        });

        validateNoTick(instance);
      });

      it('updates on tick', () => {
        const instance = new QuantileAggregator({
          duration: 2000,
          quantile: 0.75,
        });

        validateUpdateOnTick(instance);
      });
    });

    describe('count', () => {
      it('maintains a proper count', () => {
        const instance = new QuantileAggregator({
          duration: 5000,
          quantile: 0.95,
        });
        validateCounts(instance);
      });
    });

    describe('getDescription', () => {
      let instance;

      beforeEach(() => {
        instance = new QuantileAggregator({
          duration: 5000,
          quantile: 0.95,
        });
      });

      it('generates a short description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, true);
        expect(actual).toBe('p95(Latency)');
      });

      it('generates a long description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, false);
        expect(actual).toBe('Latency 95th percentile');
      });
    });
  });

  describe('P75Aggregator', () => {
    describe('static properties', () => {
      it('has the correct "key" property', () => {
        expect(P75Aggregator.key).toBe(AggregatorTypes.P75);
      });

      it('exposes a description', () => {
        expect(P75Aggregator.description).toBe('75th Percentile');
      });

      it('exposes a schema', () => {
        expect(P75Aggregator.schema).toBeDefined();
      });
    });

    it('can construct an instance', () => {
      const instance = new P75Aggregator({
        duration: 10000,
        alpha: 0.01,
      });

      expect(instance).toBeDefined();
      expect(instance.windowSize).toBe(10000);
      expect(instance.quantile).toBe(0.75);
      expect(instance.alpha).toBe(0.01);
    });

    describe('update', () => {
      it('upgrades without tick', () => {
        const instance = new P75Aggregator({
          duration: 5000,
        });

        validateNoTick(instance);
      });

      it('updates on tick', () => {
        const instance = new P75Aggregator({
          duration: 2000,
        });

        validateUpdateOnTick(instance);
      });
    });

    describe('count', () => {
      it('maintains a proper count', () => {
        const instance = new P75Aggregator({
          duration: 5000,
        });
        validateCounts(instance);
      });
    });

    describe('getDescription', () => {
      let instance;

      beforeEach(() => {
        instance = new P75Aggregator({
          duration: 5000,
        });
      });

      it('generates a short description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, true);
        expect(actual).toBe('p75(Latency)');
      });

      it('generates a long description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, false);
        expect(actual).toBe('Latency 75th percentile');
      });
    });
  });

  describe('P90Aggregator', () => {
    describe('static properties', () => {
      it('has the correct "key" property', () => {
        expect(P90Aggregator.key).toBe(AggregatorTypes.P90);
      });

      it('exposes a description', () => {
        expect(P90Aggregator.description).toBe('90th Percentile');
      });

      it('exposes a schema', () => {
        expect(P90Aggregator.schema).toBeDefined();
      });
    });

    it('can construct an instance', () => {
      const instance = new P90Aggregator({
        duration: 10000,
        alpha: 0.01,
      });

      expect(instance).toBeDefined();
      expect(instance.windowSize).toBe(10000);
      expect(instance.quantile).toBe(0.9);
      expect(instance.alpha).toBe(0.01);
    });

    describe('update', () => {
      it('upgrades without tick', () => {
        const instance = new P90Aggregator({
          duration: 5000,
        });

        validateNoTick(instance);
      });

      it('updates on tick', () => {
        const instance = new P90Aggregator({
          duration: 2000,
        });

        validateUpdateOnTick(instance);
      });
    });

    describe('count', () => {
      it('maintains a proper count', () => {
        const instance = new P90Aggregator({
          duration: 5000,
        });
        validateCounts(instance);
      });
    });

    describe('getDescription', () => {
      let instance;

      beforeEach(() => {
        instance = new P90Aggregator({
          duration: 5000,
        });
      });

      it('generates a short description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, true);
        expect(actual).toBe('p90(Latency)');
      });

      it('generates a long description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, false);
        expect(actual).toBe('Latency 90th percentile');
      });
    });
  });

  describe('P95Aggregator', () => {
    describe('static properties', () => {
      it('has the correct "key" property', () => {
        expect(P95Aggregator.key).toBe(AggregatorTypes.P95);
      });

      it('exposes a description', () => {
        expect(P95Aggregator.description).toBe('95th Percentile');
      });

      it('exposes a schema', () => {
        expect(P95Aggregator.schema).toBeDefined();
      });
    });

    it('can construct an instance', () => {
      const instance = new P95Aggregator({
        duration: 10000,
        alpha: 0.01,
      });

      expect(instance).toBeDefined();
      expect(instance.windowSize).toBe(10000);
      expect(instance.quantile).toBe(0.95);
      expect(instance.alpha).toBe(0.01);
    });

    describe('update', () => {
      it('upgrades without tick', () => {
        const instance = new P95Aggregator({
          duration: 5000,
        });

        validateNoTick(instance);
      });

      it('updates on tick', () => {
        const instance = new P95Aggregator({
          duration: 2000,
        });

        validateUpdateOnTick(instance);
      });
    });

    describe('count', () => {
      it('maintains a proper count', () => {
        const instance = new P95Aggregator({
          duration: 5000,
        });
        validateCounts(instance);
      });
    });

    describe('getDescription', () => {
      let instance;

      beforeEach(() => {
        instance = new P95Aggregator({
          duration: 5000,
        });
      });

      it('generates a short description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, true);
        expect(actual).toBe('p95(Latency)');
      });

      it('generates a long description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, false);
        expect(actual).toBe('Latency 95th percentile');
      });
    });
  });

  describe('P995Aggregator', () => {
    describe('static properties', () => {
      it('has the correct "key" property', () => {
        expect(P995Aggregator.key).toBe(AggregatorTypes.P995);
      });

      it('exposes a description', () => {
        expect(P995Aggregator.description).toBe('99.5th Percentile');
      });

      it('exposes a schema', () => {
        expect(P995Aggregator.schema).toBeDefined();
      });
    });

    it('can construct an instance', () => {
      const instance = new P995Aggregator({
        duration: 10000,
        alpha: 0.01,
      });

      expect(instance).toBeDefined();
      expect(instance.windowSize).toBe(10000);
      expect(instance.quantile).toBe(0.995);
      expect(instance.alpha).toBe(0.01);
    });

    describe('update', () => {
      it('upgrades without tick', () => {
        const instance = new P995Aggregator({
          duration: 5000,
        });

        validateNoTick(instance);
      });

      it('updates on tick', () => {
        const instance = new P995Aggregator({
          duration: 2000,
        });

        validateUpdateOnTick(instance);
      });
    });

    describe('count', () => {
      it('maintains a proper count', () => {
        const instance = new P995Aggregator({
          duration: 5000,
        });
        validateCounts(instance);
      });
    });

    describe('getDescription', () => {
      let instance;

      beforeEach(() => {
        instance = new P995Aggregator({
          duration: 5000,
        });
      });

      it('generates a short description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, true);
        expect(actual).toBe('p995(Latency)');
      });

      it('generates a long description', () => {
        const metric = new LatencyMetric({});
        const actual = instance.getDescription(metric, false);
        expect(actual).toBe('Latency 99.5th percentile');
      });
    });
  });
});

function validateNoTick(instance: QuantileAggregator): void {
  const sketch = new DDSketch({ relativeAccuracy: instance.alpha });

  for (let i = 0; i < 100; i++) {
    const value = random(1, 1000);
    checkUpdate(instance, sketch, value);
  }
}

function validateUpdateOnTick(instance: QuantileAggregator): void {
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

  // enough so we rotate
  const sliceCount =
    Math.floor(instance.windowSize / instance.granularity) * 2 + 1;

  let timeStamp = 1000;
  let lastTick = instance.lastTick;

  const sketch = new DDSketch({ relativeAccuracy: instance.alpha });
  for (let i = 0; i < sliceCount; i++) {
    const num = random(-100, 2500);
    const value = instance.update(num, timeStamp);

    if (!lastTick) lastTick = instance.lastTick;
    if (lastTick !== instance.lastTick) {
      lastTick = instance.lastTick;
      trim(instance.currentWindowStart);
      values.forEach((val) => void sketch.accept(val));
    }

    pushValue(timeStamp, num);

    const expected = calculateQuantile(
      values,
      instance.quantile,
      instance.alpha,
    );

    expect(value).toBe(expected);
    timeStamp += instance.granularity;
  }
}

function checkUpdate(
  instance: QuantileAggregator,
  sketch: DDSketch,
  value: number,
) {
  sketch.accept(value);
  const actual = instance.update(value);
  const expected = sketch.getValueAtQuantile(instance.quantile);
  expect(actual).toBe(expected);
}

function calculateQuantile(
  values: number[],
  quantile: number,
  alpha: number,
): number {
  const sketch = new DDSketch({ relativeAccuracy: alpha });
  values.forEach((x) => void sketch.accept(x));
  return sketch.getValueAtQuantile(quantile);
}
