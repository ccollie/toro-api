import { random } from 'lodash';
import { FinishedCountMetric, CounterBasedMetricOpts } from '@src/server/monitor/metrics';
import { createQueueListener } from '../../factories';

describe('FinishedCountMetric', () => {
  let queueListener;
  const defaultWindow = {
    duration: 10000,
    period: 100,
  };
  const defaultOptions: CounterBasedMetricOpts = {
    window: defaultWindow,
  };

  beforeEach(() => {
    queueListener = createQueueListener();
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new FinishedCountMetric(queueListener, defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new FinishedCountMetric(queueListener, defaultOptions);
      expect(queueListener.listenerCount('job.finished')).toBe(1);
    });
  });

  describe('updating', () => {
    test('can update count on job completed', async () => {
      const subject = new FinishedCountMetric(queueListener, defaultOptions);
      const count = random(2, 10);
      for (let i = 0; i < count; i++) {
        await queueListener.emit('job.finished');
      }
      expect(subject.value).toBe(5);
    });
  });
});
