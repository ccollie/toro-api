/* global test, expect */
import pMap from 'p-map';
import {
  Events,
  WaitTimeMetric
} from '../';
import {
  MetricCategory,
  MetricTypes,
  MetricValueType,
  QueueMetricOptions,
} from '../../types';
import { MetricTestHelper } from './metricTestHelper';
import { createJobEvent } from '../../__tests__/factories';
import { validateJobNamesFilter } from './helpers';

const EVENT_NAME = Events.FINISHED;

describe('WaitTimeMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(WaitTimeMetric.description).toBe('Job Wait Time');
    });

    it('exposes a "key" property', () => {
      expect(WaitTimeMetric.key).toBe(MetricTypes.WaitTime);
    });

    it('exposes a "unit" property', () => {
      expect(WaitTimeMetric.unit).toBe('ms');
    });

    it('exposes a "category" property', () => {
      expect(WaitTimeMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "type" property', () => {
      expect(WaitTimeMetric.type).toBe(MetricValueType.Gauge);
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new WaitTimeMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new WaitTimeMetric(defaultOptions);
      expect(subject.validEvents).toEqual([EVENT_NAME]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new WaitTimeMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new WaitTimeMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = [13, 18, 43];
      const subject = new WaitTimeMetric(defaultOptions);
      testHelper = await MetricTestHelper.forMetric(subject);
      await pMap(data, (wait) => {
        return testHelper.emitFinishedEvent(true, {
          ts: Date.now(),
          wait,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });

  describe('Triggering', () => {
    test('updates when a job is finished', async () => {
      const subject = new WaitTimeMetric(defaultOptions);
      testHelper = await MetricTestHelper.forMetric(subject);
      await testHelper.emitFinishedEvent(true, {
        ts: Date.now(),
        wait: 100,
      });
      expect(subject.value).toBe(100);
    });
  });
});
