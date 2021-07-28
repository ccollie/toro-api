import { ErrorPercentageMetric, Events, BaseMetric } from '../../src/metrics';
import { MetricTestHelper } from './metricTestHelper';
import {
  MetricCategory,
  MetricTypes,
  MetricValueType,
  QueueMetricOptions,
} from '../../src/types';
import { round } from 'lodash';
import { createJobEvent } from '../factories';
import { validateJobNamesFilter } from './helpers';

describe('ErrorPercentageMetric', () => {
  const defaultOptions: QueueMetricOptions = {};
  let testHelper: MetricTestHelper;

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  function ensureHelper(): MetricTestHelper {
    testHelper = testHelper || new MetricTestHelper();
    return testHelper;
  }

  function registerMetric(metric: BaseMetric) {
    ensureHelper().registerMetric(metric);
  }

  async function updateValues(data: boolean[]) {
    for (let i = 0; i < data.length; i++) {
      await testHelper.emitFinishedEvent(data[i]);
    }
  }

  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(ErrorPercentageMetric.description).toBe('Error Percentage');
    });

    it('exposes a "key" property', () => {
      expect(ErrorPercentageMetric.key).toBe(MetricTypes.ErrorPercentage);
    });

    it('exposes a "unit" property', () => {
      expect(ErrorPercentageMetric.unit).toBe('%');
    });

    it('exposes a "category" property', () => {
      expect(ErrorPercentageMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(ErrorPercentageMetric.type).toBe(MetricValueType.Rate);
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new ErrorPercentageMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct events', () => {
      const subject = new ErrorPercentageMetric(defaultOptions);
      expect(subject.validEvents).toEqual([Events.FINISHED]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new ErrorPercentageMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new ErrorPercentageMetric({});
      validateJobNamesFilter(metric);
    });
  });

  function calcErrorPercentage(completed: number, failures: number): number {
    return completed ? round(failures / completed, 2) * 100 : 0;
  }

  describe('Updating', () => {
    test('can update error percentage', async () => {
      const data = [true, false, false, true, false];
      const subject = new ErrorPercentageMetric(defaultOptions);
      registerMetric(subject);
      await updateValues(data);
      const failures = data.filter((x) => x === false).length;
      const percentage = calcErrorPercentage(data.length, failures);
      expect(subject.value).toBeCloseTo(percentage, 2);
    });
  });
});
