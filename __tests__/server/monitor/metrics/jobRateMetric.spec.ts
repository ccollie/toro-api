/* global test, expect */
import { advanceBy, clear } from 'jest-date-mock';
import pMap from 'p-map';
import { toArray, random } from 'lodash';
import { JobRateMetric } from '@src/server/monitor/metrics';
import { QueueListener } from '@src/server/monitor/queues';
import { createQueueListener } from '../rules/utils';

const EVENT_NAME = 'job.finished';

describe('JobRateMetric', () => {
  let queueListener: QueueListener;

  beforeEach(() => {
    queueListener = createQueueListener();
  });

  async function updateValues(data) {
    data = toArray(data);
    return pMap(data, (success) => {
      return queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        success,
        failed: !success,
      });
    });
  }

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new JobRateMetric(queueListener);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new JobRateMetric(queueListener);
      const listeners = queueListener.listenerCount(EVENT_NAME);
      expect(listeners).toBe(1);
    });
  });

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = [true, true, false, false];
      const subject = new JobRateMetric(queueListener);
      await pMap(data, (latency) => {
        return queueListener.emit(EVENT_NAME, {
          ts: Date.now(),
          latency,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });

  describe('Triggering', () => {
    test('updates when a job is finished', async () => {
      const subject = new JobRateMetric(queueListener);
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        latency: 100,
      });
      expect(subject.value).toBe(100);
    });

    test('triggers an "update" event when a job is finished', async () => {
      const subject = new JobRateMetric(queueListener);
      let eventTriggered = false;
      subject.onUpdate(() => (eventTriggered = true));
      await queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        latency: 100,
      });
      expect(eventTriggered).toBe(true);
    });
  });

  describe('windowing', () => {
    let b;

    beforeEach(() => {
      b = new JobRateMetric(queueListener, {
        duration: 5000,
        period: 500,
      });
    });

    afterEach(() => {
      clear();
    });

    it('increments and wraps buckets correctly', async () => {
      for (let i = 0; i < 7; i++) {
        for (let k = 0; k < i; k++) {
          // one failure followed by 2 successes
          await updateValues([false, true, true]);
        }

        advanceBy(1000);
      }

      expect(b.failures).toBe(20);
      expect(b.successes).toBe(40);
    });
  });

  describe('functionality', () => {
    let b;

    const createMetric = () =>
      (b = new JobRateMetric(queueListener, {
        duration: 5000,
        period: 500,
      }));

    beforeEach(() => {
      createMetric();
    });

    afterEach(() => {
      clear();
    });

    function setCompletion(failed: boolean): Promise<void> {
      return queueListener.emit(EVENT_NAME, {
        ts: Date.now(),
        latency: random(10, 5000),
        failed,
      });
    }

    const failure = (): Promise<void> => setCompletion(true);
    const success = (): Promise<void> => setCompletion(false);

    it('calculates rate correctly over time', async () => {
      // keep us right on the edge of closing (50% failure rate) for amounts of
      // time, and verify that adding another failure
      // right after each opens the circuit
      for (let runLength = 10; runLength < 20; runLength++) {
        for (let i = 0; i < runLength; i++) {
          await success();
          await failure();
          // expect(b.failure(job)).toBeFalsy();
          advanceBy(250);
        }
        await failure();
        // expect(b.failure(job)).toBeTruthy();
      }
    });

    it('resets after success', async () => {
      for (let i = 0; i < 10; i++) {
        await failure();
      }

      await success();
      expect(b.failures).toEqual(0);
      // expect(b.failure(job)).toBeFalsy();
    });
  });
});
