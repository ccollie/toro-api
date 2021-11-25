import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '../../src/redis';
import {
  FragmentationRatioMetric,
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '../../src/metrics';

describe('FragmentationRatioMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(FragmentationRatioMetric.description).toBe(
        'Memory Fragmentation Ratio',
      );
    });

    it('exposes a "key" property', () => {
      expect(FragmentationRatioMetric.key).toBe(MetricTypes.FragmentationRatio);
    });

    it('exposes a "unit" property', () => {
      expect(FragmentationRatioMetric.unit).toBe('');
    });

    it('exposes a "category" property', () => {
      expect(FragmentationRatioMetric.category).toBe(MetricCategory.Redis);
    });

    it('exposes a "type" property', () => {
      expect(FragmentationRatioMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a FragmentationRatioMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new FragmentationRatioMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    it('gets the value from redis', async () => {
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new FragmentationRatioMetric(options);
      const helper = await MetricTestHelper.forMetric(sut);
      const client = await helper.client;
      const info = await getRedisInfo(client);

      await sut.checkUpdate(helper.metricsListener, 1000);
      expect(sut.value).toBe(info.mem_fragmentation_ratio);
    });
  });
});
