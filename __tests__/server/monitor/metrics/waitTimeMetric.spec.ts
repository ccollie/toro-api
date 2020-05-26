/* global test, expect */
import pMap from 'p-map';
import { WaitTimeMetric } from '@src/server/monitor/metrics';
import { createQueueListener } from '../../factories';

const EVENT_NAME = 'job.finished';

describe('WaitTimeMetric', () => {
  let queueListener;

  beforeEach(() => {
    queueListener = createQueueListener();
  });

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new WaitTimeMetric(queueListener);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new WaitTimeMetric(queueListener);
      const listeners = queueListener.listenerCount(EVENT_NAME);
      expect(listeners).toBe(1);
    });
  });

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = [13, 18, 43];
      const subject = new WaitTimeMetric(queueListener);
      await pMap(data, (wait) => {
        queueListener.emit(EVENT_NAME, {
          ts: Date.now(),
          wait,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });

  describe('Triggering', () => {
    test('updates when a job is finished', async () => {
      const subject = new WaitTimeMetric(queueListener);
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        wait: 100,
      });
      expect(subject.value).toBe(100);
    });

    test('triggers an "update" event when a job is finished', async () => {
      const subject = new WaitTimeMetric(queueListener);
      let eventTriggered = false;
      subject.onUpdate(() => (eventTriggered = true));
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        wait: 100,
      });
      expect(eventTriggered).toBe(true);
    });
  });
});
