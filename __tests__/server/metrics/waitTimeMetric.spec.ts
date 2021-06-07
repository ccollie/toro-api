/* global test, expect */
import pMap from 'p-map';
import {
  Events,
  QueueMetricOptions,
  WaitTimeMetric,
} from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';

const EVENT_NAME = Events.FINISHED;

describe('WaitTimeMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
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

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = [13, 18, 43];
      const subject = new WaitTimeMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);
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
      testHelper = MetricTestHelper.forMetric(subject);
      await testHelper.emitFinishedEvent(true, {
        ts: Date.now(),
        wait: 100,
      });
      expect(subject.value).toBe(100);
    });
  });
});
