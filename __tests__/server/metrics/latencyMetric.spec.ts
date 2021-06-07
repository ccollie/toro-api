/* global test, expect */
import pMap from 'p-map';
import { Events, LatencyMetric } from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { QueueMetricOptions } from '@src/types';

const EVENT_NAME = Events.COMPLETED;

describe('LatencyMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
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
