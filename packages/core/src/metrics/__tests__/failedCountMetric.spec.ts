import { FailedCountMetric, Events, BaseMetric } from '../';
import { MetricTestHelper } from './metricTestHelper';
import { MetricCategory, MetricTypes, QueueMetricOptions } from '../../metrics';
import { createJobEvent } from '../../__tests__/factories';
import { validateJobNamesFilter } from './helpers';

describe('FailedCountMetric', () => {
  const defaultOptions: QueueMetricOptions = {};
  let testHelper: MetricTestHelper;

  beforeEach(async () => {
    testHelper = new MetricTestHelper();
    await testHelper.waitUntilReady();
  });

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  function registerMetric(metric: BaseMetric) {
    testHelper.registerMetric(metric);
  }

  function complete() {
    return testHelper.emitCompletedEvent();
  }

  function fail() {
    return testHelper.emitFailedEvent({});
  }

  async function updateValues(data) {
    for (let i = 0; i < data.length; i++) {
      if (data[i]) {
        await complete();
      } else {
        await fail();
      }
    }
  }

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
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new FailedCountMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct events', () => {
      const subject = new FailedCountMetric(defaultOptions);
      expect(subject.validEvents).toEqual([Events.FAILED]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new FailedCountMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new FailedCountMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('Updating', () => {
    test('can update count on failure', async () => {
      const data = [true, false, false, true, false];
      const subject = new FailedCountMetric(defaultOptions);
      registerMetric(subject);
      await updateValues(data);
      expect(subject.value).toBe(3);
    });
  });
});
