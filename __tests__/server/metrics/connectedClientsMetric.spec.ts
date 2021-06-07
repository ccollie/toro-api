import { ConnectedClientsMetric } from '@src/server/metrics';
import { delay } from '../utils';
import { MetricTestHelper } from './metricTestHelper';
import { getRedisInfo } from '@src/server/redis';
import { MetricOptions } from '@src/types';

describe('ConnectedClientsMetric', () => {
  describe('constructor', () => {
    it('constructs a ConnectedClientsMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new ConnectedClientsMetric(options);
      expect(sut).toBeDefined();
      expect(sut.id).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
      expect(MetricTestHelper.hasDescription(sut)).toBe(true);
      expect(MetricTestHelper.hasKey(sut)).toBe(true);
      expect(MetricTestHelper.hasUnit(sut)).toBe(true);
    });
  });

  describe('.checkUpdate', () => {
    it('updates the value at the given interval', async () => {
      const interval = 50;
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new ConnectedClientsMetric(options);
      const helper = MetricTestHelper.forMetric(sut);
      const client = await helper.client;
      const info = await getRedisInfo(client);

      try {
        expect(sut.value).not.toBe(info.connected_clients);
        await delay(interval);
        expect(sut.value).toBe(info.connected_clients);
      } finally {
        await helper.destroy();
      }
    });
  });
});
