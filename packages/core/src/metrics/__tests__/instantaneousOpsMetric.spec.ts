import { InstantaneousOpsMetric } from '../';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '../../types';
import { getRedisInfo } from '../../redis';
import { MetricTestHelper } from './metricTestHelper';

describe('InstantaneousOpsMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(InstantaneousOpsMetric.description).toBe('Redis Operations');
    });

    it('exposes a "key" property', () => {
      expect(InstantaneousOpsMetric.key).toBe(MetricTypes.InstantaneousOps);
    });

    it('exposes a "unit" property', () => {
      expect(InstantaneousOpsMetric.unit).toBe('ops/sec');
    });

    it('exposes a "category" property', () => {
      expect(InstantaneousOpsMetric.category).toBe(MetricCategory.Redis);
    });

    it('exposes a "type" property', () => {
      expect(InstantaneousOpsMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a InstantaneousOpsMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new InstantaneousOpsMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    it('gets the value from redis', async () => {
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new InstantaneousOpsMetric(options);
      const helper = await MetricTestHelper.forMetric(sut);
      const client = await helper.client;
      const info = await getRedisInfo(client);

      await sut.checkUpdate(helper.metricsListener, 1000);
      expect(sut.value).toBe(info.instantaneous_ops_per_sec);
    });
  });
});
