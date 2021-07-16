import {
  CurrentFailedCountMetric,
  QueueMetricOptions,
} from '@src/server/metrics';
import { clearDb, createQueue, createWorker } from '../../factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue } from 'bullmq';
import random from 'lodash/random';
import { randomString } from '../utils';
import { MetricCategory, MetricTypes, MetricValueType } from '@src/types';

describe('CurrentFailedCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(CurrentFailedCountMetric.description).toBe('Failed Jobs');
    });

    it('exposes a "key" property', () => {
      expect(CurrentFailedCountMetric.key).toBe(MetricTypes.CurrentFailedCount);
    });

    it('exposes a "unit" property', () => {
      expect(CurrentFailedCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(CurrentFailedCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(CurrentFailedCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentFailedCountMetric', () => {
      const options: QueueMetricOptions = {
        sampleInterval: 250,
      };
      const sut = new CurrentFailedCountMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
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
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of failed jobs', async () => {
      const queue = createQueue();
      const client = await queue.client;

      const sut = new CurrentFailedCountMetric({ sampleInterval: 1000 });
      const helper = MetricTestHelper.forMetric(sut, queue);

      const worker = createWorker(
        queue.name,
        async (job) => {
          throw new Error('Forced error');
        },
        { connection: client },
      );

      let counter = 0;
      let expected: number;

      const failed = new Promise<void>((resolve) => {
        worker.on('failed', async function () {
          counter--;

          if (counter === 0) {
            await sut.checkUpdate(helper.metricsListener, 1000);
            expect(sut.value).toBe(expected);

            await worker.close();
            resolve();
          }
        });
      }).finally(() => {
        Promise.all([helper.destroy(), queue.close(), worker.close()]);
      });

      const jobs = await generateJobs(queue);
      counter = expected = jobs.length;

      await failed;
    });
  });
});
