import { CurrentWaitingCountMetric } from '../../../src/server/metrics';
import { clearDb, createQueue } from '../../factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue } from 'bullmq';
import random from 'lodash/random';
import { PollingMetricOptions } from '../../../src/types';
import { randomString } from '../utils';

describe('CurrentWaitingCountMetric', () => {
  describe('constructor', () => {
    it('constructs a CurrentWaitingCountMetric', () => {
      const options: PollingMetricOptions = {
        id: randomString(),
        name: randomString(),
        interval: 250,
      };
      const sut = new CurrentWaitingCountMetric(options);
      expect(sut).toBeDefined();
      expect(sut.id).toBe(options.id);
      expect(sut.name).toBe(options.name);
      expect(sut.interval).toBe(options.interval);
      expect(MetricTestHelper.hasDescription(sut)).toBe(true);
      expect(MetricTestHelper.hasKey(sut)).toBe(true);
      expect(MetricTestHelper.hasUnit(sut)).toBe(true);
    });
  });

  describe('.checkUpdate', () => {
    afterEach(async () => {
      await clearDb();
    });

    function generateJobs(queue: Queue, options = {}): Promise<Job[]> {
      const datas = [];
      const count = random(1, 10);
      const name = 'names-' + randomString(3);
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of WAITING jobs', async () => {
      const queue = await createQueue();
      const jobs = await generateJobs(queue);
      const count = jobs.length;

      const options: PollingMetricOptions = {
        interval: 1000,
      };
      const sut = new CurrentWaitingCountMetric(options);
      const helper = MetricTestHelper.forMetric(sut, queue);

      try {
        await sut.checkUpdate();
        expect(sut.value).toBe(count);
      } finally {
        await queue.close();
        await helper.destroy();
      }
    });
  });
});
