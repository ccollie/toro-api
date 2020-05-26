import { FailureCountMetric, CounterBasedMetricOpts } from '@src/server/monitor/metrics';
import { createQueueListener } from '../../factories';

describe('FailureCountMetric', () => {
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

  function complete() {
    return queueListener.emit('job.completed');
  }

  function fail() {
    return queueListener.emit('job.failed');
  }

  async function updateValues(data) {
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
      const subject = new FailureCountMetric(queueListener, defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new FailureCountMetric(queueListener, defaultOptions);
      expect(queueListener.listenerCount('job.failed')).toBe(1);
    });
  });

  describe('Updating', () => {
    test('can update count on failure', async () => {
      const data = [true, false, false, true, false];
      const subject = new FailureCountMetric(queueListener, defaultOptions);
      await updateValues(data);
      expect(subject.value).toBe(3);
    });
  });
});
