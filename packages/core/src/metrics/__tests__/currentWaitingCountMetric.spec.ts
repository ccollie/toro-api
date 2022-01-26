import {Job, Queue} from 'bullmq';
import { random } from '@alpen/shared';
import { getUniqueId } from 'packages/core/src/ids';
import {
  CurrentWaitingCountMetric,
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType
} from '../';
import { clearDb, createQueue } from '../../__tests__/factories';
import { MetricTestHelper } from './metricTestHelper';

describe('CurrentWaitingCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(CurrentWaitingCountMetric.description).toBe('Waiting Jobs');
    });

    it('exposes a "key" property', () => {
      expect(CurrentWaitingCountMetric.key).toBe(MetricTypes.Waiting);
    });

    it('exposes a "unit" property', () => {
      expect(CurrentWaitingCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(CurrentWaitingCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(CurrentWaitingCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentWaitingCountMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new CurrentWaitingCountMetric(options);
      expect(sut).toBeDefined();
      expect(sut.sampleInterval).toBe(options.sampleInterval);
    });
  });

  describe('.checkUpdate', () => {
    afterEach(async () => {
      await clearDb();
    });

    function generateJobs(queue: Queue, options = {}): Promise<Job[]> {
      const datas = [];
      const count = random(1, 10);
      const name = 'names-' + getUniqueId();
      for (let i = 0; i < count; i++) datas.push({ name, data: random(0, 99) });

      return queue.addBulk(datas);
    }

    it('should get the correct number of WAITING jobs', async () => {
      const queue = await createQueue();
      const jobs = await generateJobs(queue);
      const count = jobs.length;

      const options: MetricOptions = {
        sampleInterval: 1000,
      };
      const sut = new CurrentWaitingCountMetric(options);
      const helper = await MetricTestHelper.forMetric(sut, queue);

      const listener = helper.metricsListener;

      try {
        await sut.checkUpdate(listener, 1000);
        expect(sut.value).toBe(count);
      } finally {
        await queue.close();
        await helper.destroy();
      }
    });
  });
});
