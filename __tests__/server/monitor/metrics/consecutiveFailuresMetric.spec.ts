import { ConsecutiveFailuresMetric } from '@src/server/monitor/metrics';
import { CounterBasedMetricOpts } from '@src/server/monitor/metrics/counterBasedMetric';
import { createQueueListener } from '../../factories';

describe('ConsecutiveFailuresMetric', () => {
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

  async function updateValues(data): Promise<void> {
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
      const subject = new ConsecutiveFailuresMetric(
        queueListener,
        defaultOptions,
      );
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct queueListener events', () => {
      const subject = new ConsecutiveFailuresMetric(
        queueListener,
        defaultOptions,
      );
      expect(queueListener.listenerCount('job.completed')).toBe(1);
      expect(queueListener.listenerCount('job.failed')).toBe(1);
    });
  });

  describe('Updating', () => {
    test('updates simple values', async () => {
      const data = [true, false, false, false];
      const subject = new ConsecutiveFailuresMetric(
        queueListener,
        defaultOptions,
      );
      await updateValues(data);
      expect(subject.value).toBe(3);
    });

    test('resets after a successful job', async () => {
      const data = [true, false, false, true, true];
      const subject = new ConsecutiveFailuresMetric(
        queueListener,
        defaultOptions,
      );
      await updateValues(data);
      expect(subject.value).toBe(2);
    });
  });
});
