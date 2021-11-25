import {
  CurrentActiveCountMetric,
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
} from '../../src/metrics';
import { clearDb, createQueue, createWorker } from '../factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue } from 'bullmq';
import { random } from 'lodash';
import { delay, randomString } from '../utils';

describe('CurrentActiveCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(CurrentActiveCountMetric.description).toBe('Active Jobs');
    });

    it('exposes a "key" property', () => {
      expect(CurrentActiveCountMetric.key).toBe(MetricTypes.ActiveJobs);
    });

    it('exposes a "unit" property', () => {
      expect(CurrentActiveCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(CurrentActiveCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(CurrentActiveCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentActiveCountMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new CurrentActiveCountMetric(options);
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
      const count = random(1, 10);
      const name = 'names-' + randomString(3);
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of ACTIVE jobs', async () => {
      const queue = await createQueue();

      const interval = 25000;
      const options: MetricOptions = {
        sampleInterval: interval,
      };
      const sut = new CurrentActiveCountMetric(options);
      const helper = await MetricTestHelper.forMetric(sut, queue);

      let jobCount: number;
      let processor;
      const processing = new Promise((resolve) => {
        processor = async (job: Job) => {
          if (--jobCount === 0) process.nextTick(resolve);
          await delay(1500); // keep job ACTIVE long enough to count it
        };
      });

      const worker = createWorker(queue.name, processor, { concurrency: 1 });
      await worker.waitUntilReady();
      await queue.pause();

      const jobs = await generateJobs(queue);
      const count = (jobCount = jobs.length);

      await queue.resume();
      await processing;

      try {
        await sut.checkUpdate(helper.metricsListener, 1000);
        expect(sut.value).toBe(count);
      } finally {
        await queue.close();
        await helper.destroy();
        await worker.close();
      }
    });
  });
});
