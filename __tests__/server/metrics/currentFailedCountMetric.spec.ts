import { CurrentFailedCountMetric } from '../../../src/server/metrics';
import { clearDb, createQueue, randomString } from '../utils';
import { PollingMetricOptions } from '../../../src/server/metrics/baseMetric';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue, Worker } from 'bullmq';
import random from 'lodash/random';
import { createWorker } from '../factories';

describe('CurrentFailedCountMetric', () => {

  describe('constructor', () => {
    it('constructs a CurrentFailedCountMetric', () => {
      const options: PollingMetricOptions = {
        id: randomString(),
        name: randomString(),
        jobNames: [randomString()],
        interval: 250
      }
      const sut = new CurrentFailedCountMetric(options);
      expect(sut).toBeDefined();
      expect(sut.id).toBe(options.id);
      expect(sut.name).toBe(options.name);
      expect(sut.jobNames).toBe(options.jobNames);
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
      const count = random(10, 20);
      const name = 'names-' + randomString(3);
      for(let i = 0; i < count; i++) datas.push(
        { name, data: random(0, 99) }
      );

      return queue.addBulk(datas);
    }

    it('should get the correct number of FAILED jobs', async () => {
      jest.setTimeout(40000);

      const queue = createQueue();

      const interval = 8000;
      const options: PollingMetricOptions = {
        interval
      }
      const sut = new CurrentFailedCountMetric(options);
      const helper = MetricTestHelper.forMetric(sut, queue);

      let jobCount: number;
      let failCount = 0;
      let processor;
      const processing = new Promise((resolve) => {

        const checkResolve = () => {
          if (--jobCount === 0) {
            process.nextTick(resolve);
          }
        }

        processor = async (job: Job) => {
          if (random(0, 10) > 5) {
            failCount++;
            checkResolve();
            throw new Error('Failed job #' + jobCount)
          }
          checkResolve();
        };
      });

      const worker = createWorker(queue.name, processor);
      await worker.waitUntilReady();

      const jobs = await generateJobs(queue);
      jobCount = jobs.length;

      await processing;

      try {
        await sut.checkUpdate();
        expect(sut.value).toBe(failCount);
      } finally {
        await queue.close();
        await helper.destroy();
        await worker.close();
      }
    });
  });

})