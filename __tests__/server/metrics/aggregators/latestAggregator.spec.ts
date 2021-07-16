import { LatestAggregator, LatencyMetric } from '@src/server/metrics';
import random from 'lodash/random';
import { AggregatorTypes } from '@src/types';

describe('LatestAggregator', () => {
  describe('static properties', () => {
    it('has the correct "key" property', () => {
      expect(LatestAggregator.key).toBe(AggregatorTypes.Latest);
    });

    it('exposes a description', () => {
      expect(LatestAggregator.description).toBe('Latest value');
    });

    it('does not expose a schema', () => {
      expect(LatestAggregator.schema).toBeDefined();
    });
  });

  it('can construct an instance', () => {
    const instance = new LatestAggregator();
    expect(instance).toBeDefined();
  });

  describe('update', () => {
    it('maintains the latest value', () => {
      const instance = new LatestAggregator();
      for (let i = 0; i < 20; i++) {
        const num = random(0, 99);
        const ts = 1000 + i * 10;
        const value = instance.update(num, ts);
        expect(value).toBe(num);
      }
    });
  });

  describe('count', () => {
    let instance: LatestAggregator;

    beforeEach(() => {
      instance = new LatestAggregator();
    });

    it('maintains a proper count', () => {
      const count = random(5, 50);
      for (let i = 0; i < count; i++) {
        const value = random(0, 99);
        instance.update(value, 1000);
      }
      expect(instance.count).toBe(count);
    });
  });

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      instance = new LatestAggregator();
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('Latency');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('Latency latest value');
    });
  });
});
