import { RedisMetric } from '../../../src/server/metrics/redisMetrics';
import { createQueue } from '../utils';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '../../../src/server/redis';
import { PollingMetricOptions } from '../../../src/types';

describe('RedisMetric', () => {
  describe('constructor', () => {
    const sut = new RedisMetric({ interval: 100 }, 'connected_count');
    expect(sut).toBeDefined();
    expect(sut.interval).toBe(100);
  });

  describe('.checkUpdate', () => {
    it('should get a value from redis', async () => {
      const queue = await createQueue();
      const client = await queue.client;

      const interval = 8000;
      const options: PollingMetricOptions = {
        interval,
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
