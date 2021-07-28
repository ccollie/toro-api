import { MaxAggregator, LatencyMetric } from '@src/../../../../packages/core/src/metrics';
import { ManualClock } from '@src/../../../../packages/core/src/lib';
import { AggregatorTypes } from '@src/../../../../packages/core/types';
import { validateCounts } from './helpers';

describe('MaxAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(MaxAggregator.key).toBe(AggregatorTypes.Max);
    });

    it('exposes a description', () => {
      expect(MaxAggregator.description).toBe('Maximum');
    });

    it('exposes a schema', () => {
      expect(MaxAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new MaxAggregator({
      duration: 10000,
    });

    expect(instance).toBeDefined();
  });

  describe('update', () => {
    it('upgrades without tick', () => {
      const instance = new MaxAggregator({
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

      const instance = new MaxAggregator({
        duration: 3000,
      });
      let value = instance.update(40, clock.getTime());
      expect(value).toBe(40);
      clock.advanceBy(instance.granularity);
      value = instance.update(20, clock.getTime());
      expect(value).toBe(40);

      clock.advanceBy(instance.granularity - 5);
      value = instance.update(30, clock.getTime());
      expect(value).toBe(40);

      clock.advanceBy(instance.granularity);
      value = instance.update(10, clock.getTime());
      expect(value).toBe(10);
    });
  });

  describe('count', () => {
    it('maintains a proper count', () => {
      const instance = new MaxAggregator({
        duration: 5000,
      });

      validateCounts(instance);
    });
  });

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      instance = new MaxAggregator({
        duration: 5000,
      });
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('max(Latency)');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency max');
    });
  });
});
