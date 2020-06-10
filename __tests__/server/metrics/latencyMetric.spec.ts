/* global test, expect */
import pMap from 'p-map';
import { LatencyMetric, MetricOptions } from '../../../src/server/metrics';
import { createQueueListener } from '../factories';

const EVENT_NAME = 'job.finished';

describe('LatencyMetric', () => {
  let queueListener;
  const defaultWindow = {
    duration: 10000,
    interval: 100,
  };
  const defaultOptions: MetricOptions = {
    window: defaultWindow,
  };

  beforeEach(() => {
    queueListener = createQueueListener();
  });

  afterEach(() => {
    queueListener.destroy();
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new LatencyMetric(queueListener, defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new LatencyMetric(queueListener, defaultOptions);
      const listeners = queueListener.listenerCount(EVENT_NAME);
      expect(listeners).toBe(1);
    });
  });

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = [13, 18, 43];
      const subject = new LatencyMetric(queueListener, defaultOptions);
      await pMap(data, (latency) => {
        queueListener.emit(EVENT_NAME, {
          ts: Date.now(),
          latency,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });

  describe('Triggering', () => {
    test('updates when a job is finished', async () => {
      const subject = new LatencyMetric(queueListener, defaultOptions);
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        latency: 100,
      });
      expect(subject.value).toBe(100);
    });

    test('triggers an "update" event when a job is finished', async () => {
      const subject = new LatencyMetric(queueListener, defaultOptions);
      let eventTriggered = false;
      subject.onUpdate(() => (eventTriggered = true));
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        latency: 100,
      });
      expect(eventTriggered).toBe(true);
    });
  });
});
