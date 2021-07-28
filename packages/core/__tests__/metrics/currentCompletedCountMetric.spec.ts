import {
  CurrentCompletedCountMetric,
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '../../src/metrics';
import { clearDb, createQueue, createWorker } from '../factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue, RedisClient } from 'bullmq';
import random from 'lodash/random';
import { randomString } from '../utils';

// see https://github.com/facebook/jest/issues/11543
jest.setTimeout(10000);

describe('CurrentCompletedCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(CurrentCompletedCountMetric.description).toBe(
        'Current COMPLETED Jobs',
      );
    });

    it('exposes a "key" property', () => {
      expect(CurrentCompletedCountMetric.key).toBe(
        MetricTypes.CurrentCompletedCount,
      );
    });

    it('exposes a "unit" property', () => {
      expect(CurrentCompletedCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(CurrentCompletedCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(CurrentCompletedCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentCompletedCountMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new CurrentCompletedCountMetric(options);
      expect(sut).toBeDefined();
    });
  });

  describe('.checkUpdate', () => {
    let queue: Queue;
    let client: RedisClient;

    beforeEach(async () => {
      await clearDb();
      queue = await createQueue();
      client = await queue.client;
    });

    function generateJobs(queue: Queue, options = {}): Promise<Job[]> {
      const datas = [];
      const count = random(5, 10);
      const name = 'names-' + randomString(3);
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of completed jobs', async () => {
      const sut = new CurrentCompletedCountMetric({ sampleInterval: 1000 });
      const helper = MetricTestHelper.forMetric(sut, queue);
      const listener = helper.metricsListener;

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const worker = createWorker(queue.name, async (job) => {}, {
        connection: client,
      });

      let counter = 0;
      let expected: number;

      const completed = new Promise<void>((resolve) => {
        worker.on('completed', async function () {
          counter--;

          if (counter === 0) {
            const jobs = await queue.getFailed();
            expect(Array.isArray(jobs)).toBe(true);

            await sut.checkUpdate(listener, 1000);
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

      await completed;
    });
  });
});
