import { random } from '@alpen/shared';
import {
  Events,
  FinishedCountMetric,
  MetricCategory,
  MetricTypes,
  MetricValueType,
  QueueMetricOptions,
} from '../';
import { createJobEvent } from '../../__tests__/factories';
import { validateJobNamesFilter } from './helpers';
import { MetricTestHelper } from './metricTestHelper';

describe('FinishedCountMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(FinishedCountMetric.description).toBe('Finished Jobs');
    });

    it('exposes a "key" property', () => {
      expect(FinishedCountMetric.key).toBe(MetricTypes.Finished);
    });

    it('exposes a "unit" property', () => {
      expect(FinishedCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(FinishedCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(FinishedCountMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new FinishedCountMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new FinishedCountMetric(defaultOptions);
      expect(subject.validEvents).toEqual([Events.FINISHED]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FINISHED);
      const metric = new FinishedCountMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new FinishedCountMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('updating', () => {
    test('can update count on job finish', async () => {
      const subject = new FinishedCountMetric(defaultOptions);
      testHelper = await MetricTestHelper.forMetric(subject);

      const count = random(2, 15);
      for (let i = 0; i < count; i++) {
        const success = random(0, 99) % 2 === 0;
        await testHelper.emitFinishedEvent(success, {});
      }
      expect(subject.value).toBe(count);
    });
  });
});
