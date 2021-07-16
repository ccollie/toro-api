import { UsedMemoryMetric, MinAggregator } from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '@src/server/redis';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '@src/types';
import nanoid from 'nanoid';
import { validateMetricToJSON } from './helpers';

describe('UsedMemoryMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(UsedMemoryMetric.description).toBe('Used Memory');
    });

    it('exposes a "key" property', () => {
      expect(UsedMemoryMetric.key).toBe(MetricTypes.UsedMemory);
    });

    it('exposes a "unit" property', () => {
      expect(UsedMemoryMetric.unit).toBe('bytes');
    });

    it('exposes a "category" property', () => {
      expect(UsedMemoryMetric.category).toBe(MetricCategory.Redis);
    });

    it('exposes a "type" property', () => {
      expect(UsedMemoryMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a UsedMemoryMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new UsedMemoryMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    it('gets the value from redis', async () => {
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new UsedMemoryMetric(options);
      const helper = MetricTestHelper.forMetric(sut);
      const client = await helper.client;
      const info = await getRedisInfo(client);

      await sut.checkUpdate(helper.metricsListener, 1000);
      expect(sut.value).toBe(info.used_memory_rss);
    });
  });

  describe('toJSON', function () {
    it('serializes to JSON', () => {
      const metric = new UsedMemoryMetric({
        sampleInterval: 1000,
      });
      metric.id = nanoid.nanoid();
      metric.isActive = false;
      metric.description = 'Yeah !!! ' + nanoid.nanoid();
      metric.aggregator = new MinAggregator({
        duration: 40000,
        granularity: 4000,
      });
      validateMetricToJSON(metric);
    });
  });
});
