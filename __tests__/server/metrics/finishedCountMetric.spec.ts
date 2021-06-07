import { random } from 'lodash';
import { FinishedCountMetric, Events } from '../../../src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { QueueMetricOptions } from '../../../src/types';

describe('FinishedCountMetric', () => {
  let testHelper: MetricTestHelper;
  const defaultOptions: QueueMetricOptions = {};

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
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

  describe('updating', () => {
    test('can update count on job COMPLETED', async () => {
      const subject = new FinishedCountMetric(defaultOptions);
      testHelper = MetricTestHelper.forMetric(subject);

      const count = random(2, 15);
      for (let i = 0; i < count; i++) {
        const success = random(0, 99) % 2 === 0;
        await testHelper.emitFinishedEvent(success, {});
      }
      expect(subject.value).toBe(count);
    });
  });
});
