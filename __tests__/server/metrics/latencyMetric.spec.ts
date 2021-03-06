/* global test, expect */
import pMap from 'p-map';
import { Events, LatencyMetric } from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { MetricCategory, MetricTypes, QueueMetricOptions } from '@src/types';
import { createJobEvent } from '../../factories';
import { validateJobNamesFilter } from './helpers';

const EVENT_NAME = Events.COMPLETED;

describe('LatencyMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  describe('static properties', () => {
    it('exposes a "description" property', () => {
      expect(LatencyMetric.description).toBe('Job Latency');
    });

    it('exposes a "key" property', () => {
      expect(LatencyMetric.key).toBe(MetricTypes.Latency);
    });

    it('exposes a "unit" property', () => {
      expect(LatencyMetric.unit).toBe('ms');
    });

    it('exposes a "category" property', () => {
      expect(LatencyMetric.category).toBe(MetricCategory.Queue);
    });

    it('exposes a "schema" property', () => {
      expect(LatencyMetric.schema).toBeDefined();
    });
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new LatencyMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new LatencyMetric(defaultOptions);
      expect(subject.validEvents).toEqual([EVENT_NAME]);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new LatencyMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const metric = new LatencyMetric({});
      validateJobNamesFilter(metric);
    });
  });

  describe('Updating', () => {
    test('properly updates', async () => {
      const data = [13, 18, 43];
      const subject = new LatencyMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);
      await pMap(data, (latency) => {
        return testHelper.emitCompletedEvent({
          ts: Date.now(),
          latency,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });
});
