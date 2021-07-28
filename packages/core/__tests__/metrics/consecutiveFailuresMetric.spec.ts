import { MetricTestHelper } from './metricTestHelper';
import {
  ConsecutiveFailuresMetric,
  Events,
  MetricCategory,
  MetricTypes,
  QueueMetricOptions,
} from '../../src/metrics';
import { createJobEvent } from '../factories';
import { validateJobNamesFilter } from './helpers';

describe('ConsecutiveFailuresMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  function complete() {
    return testHelper.emitFinishedEvent(true);
  }

  function fail() {
    return testHelper.emitFinishedEvent(false);
  }

  async function updateValues(data: boolean[]): Promise<void> {
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
      expect(ConsecutiveFailuresMetric.description).toBe(
        'Consecutive Failures',
      );
    });

    it('exposes a "key" property', () => {
      expect(ConsecutiveFailuresMetric.key).toBe(
        MetricTypes.ConsecutiveFailures,
      );
    });

    it('exposes a "unit" property', () => {
      expect(ConsecutiveFailuresMetric.unit).toBe('jobs');
    });

    it('exposes a "category" property', () => {
      expect(ConsecutiveFailuresMetric.category).toBe(MetricCategory.Queue);
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new ConsecutiveFailuresMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct events', () => {
      const subject = new ConsecutiveFailuresMetric(defaultOptions);
      expect(subject.validEvents).toEqual([Events.FINISHED]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new ConsecutiveFailuresMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new ConsecutiveFailuresMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('Updating', () => {
    test('updates simple values', async () => {
      const data = [true, false, false, false];
      const subject = new ConsecutiveFailuresMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);
      await updateValues(data);
      expect(subject.value).toBe(3);
    });

    test('resets after a successful job', async () => {
      const data = [true, false, false, true, true];
      const subject = new ConsecutiveFailuresMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);
      await updateValues(data);
      expect(subject.value).toBe(0);
    });
  });
});
