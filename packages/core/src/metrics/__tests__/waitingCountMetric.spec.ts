import {Job, Queue} from 'bullmq';
import { random } from '@alpen/shared';
import { WaitingCountMetric } from '../';
import { getUniqueId } from '../../ids';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType
} from '../../types';
import { clearDb, createQueue } from '../../__tests__/factories';
import { MetricTestHelper } from './metricTestHelper';

describe('WaitingCountMetric', () => {
  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(WaitingCountMetric.description).toBe('Waiting Jobs');
    });

    it('exposes a "key" property', () => {
      expect(WaitingCountMetric.key).toBe(MetricTypes.Waiting);
    });

    it('exposes a "unit" property', () => {
      expect(WaitingCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(WaitingCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(WaitingCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    it('constructs a CurrentWaitingCountMetric', () => {
      const options: MetricOptions = {
        sampleInterval: 250,
      };
      const sut = new WaitingCountMetric(options);
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
      const sut = new WaitingCountMetric(options);
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
