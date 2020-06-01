import { random } from 'lodash';
import {
  CompletedCountMetric,
  Events,
  MetricOptions,
} from '../../../src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';

describe('CompletedCountMetric', () => {
  let testHelper: MetricTestHelper;

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  });

  const defaultOptions: MetricOptions = {
    id: 'test'
  };

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

  describe('Updating', () => {
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
