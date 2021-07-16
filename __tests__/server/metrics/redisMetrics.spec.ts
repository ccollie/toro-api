import { RedisMetric } from '@src/server/metrics/redisMetrics';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '@src/server/redis';
import { MetricCategory, MetricOptions, MetricValueType } from '@src/types';
import { createQueue } from '../../factories';

describe('RedisMetric', () => {
  describe('static properties', () => {
    it('exposes a "category" property', () => {
      expect(RedisMetric.category).toBe(MetricCategory.Redis);
    });

    it('exposes a "schema" property', () => {
      expect(RedisMetric.schema).toBeDefined();
    });

    it('exposes a "type" property', () => {
      expect(RedisMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    const sut = new RedisMetric({ sampleInterval: 100 }, 'connected_count');
    expect(sut).toBeDefined();
    expect(sut.sampleInterval).toBe(100);
  });

  describe('.checkUpdate', () => {
    it('should get a value from redis', async () => {
      const queue = await createQueue();
      const client = await queue.client;

      const interval = 8000;
      const options: MetricOptions = {
        sampleInterval: interval,
      };
      const sut = new RedisMetric(options, 'total_system_memory');
      const helper = MetricTestHelper.forMetric(sut, queue);
      const info = await getRedisInfo(client);

      try {
        await sut.checkUpdate(helper.metricsListener, 100);
        expect(sut.value).toBe(info.total_system_memory);
      } finally {
        await queue.close();
        await helper.destroy();
      }
    });
  });
});
