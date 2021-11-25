import {ConnectedClientsMetric, MetricCategory, MetricOptions, MetricTypes} from '../../src/metrics';
import {getRedisInfo} from '../../src/redis';
import {delay} from '../utils';
import {MetricTestHelper} from './metricTestHelper';

describe('ConnectedClientsMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(ConnectedClientsMetric.description).toBe('Connected Clients');
    });

    it('exposes a "key" property', () => {
      expect(ConnectedClientsMetric.key).toBe(MetricTypes.ConnectedClients);
    });

    it('exposes a "unit" property', () => {
      expect(ConnectedClientsMetric.unit).toBe('connections');
    });

    it('exposes a "category" property', () => {
      expect(ConnectedClientsMetric.category).toBe(MetricCategory.Redis);
    });
  });

  describe('constructor', () => {
    it('constructs a ConnectedClientsMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new ConnectedClientsMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    it('updates the value at the given interval', async () => {
      const interval = 50;
      const options: MetricOptions = {
        sampleInterval: 50,
      };
      const sut = new ConnectedClientsMetric(options);
      const helper = await MetricTestHelper.forMetric(sut);
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
