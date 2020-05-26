import { random } from 'lodash';
import { CompletedCountMetric } from '@src/server/monitor/metrics';
import { CounterBasedMetricOpts } from '@src/server/monitor/metrics/counterBasedMetric';
import { createQueueListener } from '../../factories';

describe('CompletedCountMetric', () => {
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
      const subject = new CompletedCountMetric(queueListener, defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new CompletedCountMetric(queueListener, defaultOptions);
      expect(queueListener.listenerCount('job.completed')).toBe(1);
    });
  });

  describe('Updating', () => {
    test('can update count on success', async () => {
      const subject = new CompletedCountMetric(queueListener, defaultOptions);
      const count = random(2, 10);
      for (let i = 0; i < count; i++) {
        await queueListener.emit('job.completed');
      }
      expect(subject.value).toBe(count);
    });
  });
});
