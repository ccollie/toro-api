import { random } from 'lodash';
import {
  CompletedCountMetric,
  Events,
  QueueMetricOptions,
} from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { MetricCategory, MetricTypes, MetricValueType } from '@src/types';
import { createJobEvent } from '../../factories';
import { validateJobNamesFilter } from './helpers';

describe('CompletedCountMetric', () => {
  let testHelper: MetricTestHelper;

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  const defaultOptions: QueueMetricOptions = {
    jobNames: [],
  };

  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(CompletedCountMetric.description).toBe('Completed Jobs');
    });

    it('exposes a "key" property', () => {
      expect(CompletedCountMetric.key).toBe(MetricTypes.Completed);
    });

    it('exposes a "unit" property', () => {
      expect(CompletedCountMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(CompletedCountMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(CompletedCountMetric.type).toBe(MetricValueType.Count);
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new CompletedCountMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new CompletedCountMetric(defaultOptions);
      expect(subject.validEvents).toStrictEqual([Events.COMPLETED]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new CompletedCountMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new CompletedCountMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('Updates', () => {
    test('can update count on success', async () => {
      const subject = new CompletedCountMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);
      const count = random(2, 10);
      for (let i = 0; i < count; i++) {
        await testHelper.emitCompletedEvent();
      }
      expect(subject.value).toBe(count);
    });
  });
});
