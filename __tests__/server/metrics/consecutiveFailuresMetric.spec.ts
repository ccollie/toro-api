import { ConsecutiveFailuresMetric, Events } from '@src/server/metrics';

import { MetricTestHelper } from './metricTestHelper';
import { QueueMetricOptions } from '@src/types';

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
