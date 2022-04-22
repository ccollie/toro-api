import { FailedCountMetric } from '../';
import { getUniqueId } from '../../ids';
import {
  QueueMetricOptions,
  MetricCategory,
  MetricTypes,
  MetricValueType,
} from '../../types';
import { clearDb, createQueue, createWorker } from '../../__tests__/factories';
import { MetricTestHelper } from './metricTestHelper';
import { Job, Queue } from 'bullmq';
import { random } from '@alpen/shared';

describe('FailedCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(FailedCountMetric.description).toBe('Failed Jobs');
    });

    it('exposes a "key" property', () => {
      expect(FailedCountMetric.key).toBe(MetricTypes.Failures);
    });

    it('exposes a "unit" property', () => {
      expect(FailedCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(FailedCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(FailedCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentFailedCountMetric', () => {
      const options: QueueMetricOptions = {
        sampleInterval: 250,
      };
      const sut = new FailedCountMetric(options);
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
      const name = 'names-' + getUniqueId();
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of failed jobs', async () => {
      const queue = await createQueue();
      const client = await queue.client;

      const sut = new FailedCountMetric({ sampleInterval: 1000 });
      const helper = await MetricTestHelper.forMetric(sut, queue);

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
