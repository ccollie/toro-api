import { CurrentCompletedCountMetric } from '../../../src/server/metrics';
import { clearDb, createQueue, createWorker } from '../../factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue } from 'bullmq';
import random from 'lodash/random';
import { PollingMetricOptions } from '../../../src/types';
import { randomString } from '../utils';

describe('CurrentCompletedCountMetric', () => {
  describe('constructor', () => {
    it('constructs a CurrentCompletedCountMetric', () => {
      const options: PollingMetricOptions = {
        interval: 250,
      };
      const sut = new CurrentCompletedCountMetric(options);
      expect(sut).toBeDefined();
      expect(sut.interval).toBe(options.interval);
      expect(MetricTestHelper.hasDescription(sut)).toBe(true);
      expect(MetricTestHelper.hasKey(sut)).toBe(true);
      expect(MetricTestHelper.hasUnit(sut)).toBe(true);
    });
  });

  describe('.checkUpdate', () => {
    beforeEach(async () => {
      await clearDb();
    });

    function generateJobs(queue: Queue, options = {}): Promise<Job[]> {
      const datas = [];
      const count = random(5, 10);
      const name = 'names-' + randomString(3);
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of COMPLETED jobs', async () => {
      const queue = await createQueue();

      const interval = 25000;
      const options: PollingMetricOptions = {
        interval,
      };
      const sut = new CurrentCompletedCountMetric(options);
      const helper = MetricTestHelper.forMetric(sut, queue);

      let jobCount: number;
      let processor;
      const processing = new Promise((resolve, reject) => {
        processor = async (job: Job) => {
          if (--jobCount === 0) {
            process.nextTick(resolve);
          }
        };
      });

      const worker = createWorker(queue.name, processor);
      await worker.waitUntilReady();
      await queue.pause();

      const jobs = await generateJobs(queue);
      const count = (jobCount = jobs.length);

      await queue.resume();
      await processing;

      try {
        await sut.checkUpdate();
        expect(sut.value).toBe(count);
      } finally {
        await queue.close();
        await helper.destroy();
        await worker.close();
      }
    });
  });
});
