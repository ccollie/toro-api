import { RedisMetric } from '@src/server/metrics/redisMetrics';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '@src/server/redis';
import { MetricOptions } from '@src/types';
import { createQueue } from '../../factories';

describe('RedisMetric', () => {
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
        await sut.checkUpdate();
        expect(sut.value).toBe(info.total_system_memory);
      } finally {
        await queue.close();
        await helper.destroy();
      }
    });
  });
});
