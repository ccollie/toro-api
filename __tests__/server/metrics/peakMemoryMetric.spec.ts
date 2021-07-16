import { PeakMemoryMetric } from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '@src/server/redis';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '@src/types';

describe('PeakMemoryMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(PeakMemoryMetric.description).toBe('Redis Peak Memory');
    });

    it('exposes a "key" property', () => {
      expect(PeakMemoryMetric.key).toBe(MetricTypes.PeakMemory);
    });

    it('exposes a "unit" property', () => {
      expect(PeakMemoryMetric.unit).toBe('bytes');
    });

    it('exposes a "category" property', () => {
      expect(PeakMemoryMetric.category).toBe(MetricCategory.Redis);
    });

    it('exposes a "type" property', () => {
      expect(PeakMemoryMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a PeakMemoryMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new PeakMemoryMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    it('gets the value from redis', async () => {
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new PeakMemoryMetric(options);
      const helper = MetricTestHelper.forMetric(sut);
      const client = await helper.client;
      const info = await getRedisInfo(client);

      await sut.checkUpdate();
      expect(sut.value).toBe(info.used_memory_peak);
    });
  });
});
