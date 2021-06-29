import ms from 'ms';
import { random } from 'lodash';
import {
  BaseMetric,
  CompletedCountMetric,
  JobRateMetric,
  LatencyMetric,
  MetricsListener,
} from '@src/server/metrics';
import { QueueListener } from '@src/server/queues';
import { QueueListenerHelper, createQueueListener } from '../../factories';
import { delay } from '../utils';

describe('MetricsListener', () => {
  let sut: MetricsListener;
  let queueListener: QueueListener;
  let helper: QueueListenerHelper;

  beforeEach(() => {
    queueListener = createQueueListener();
    helper = new QueueListenerHelper(queueListener);
    sut = new MetricsListener(queueListener);
  });

  afterEach(async () => {
    sut.destroy();
    jest.useRealTimers();
    await queueListener.destroy();
  });

  describe('registerMetric', () => {
    it('can register metrics', () => {
      const metric = new LatencyMetric({});
      sut.registerMetric(metric);
      const metrics = sut.metrics;
      expect(metrics.length).toBe(1);
      expect(metrics[0]).toBe(metric);
    });
  });

  describe('unregisterMetric', () => {
    it('can unregister metrics', () => {
      const metric = new LatencyMetric({});
      sut.registerMetric(metric);
      expect(sut.metrics.length).toBe(1);
      sut.unregisterMetric(metric);
      expect(sut.metrics.length).toBe(0);
    });
  });

  describe('event handling', () => {
    it('proxies queue events to metrics', async () => {
      const metric = new LatencyMetric({});
      sut.registerMetric(metric);
      const latency = random(100, 1000);

      const spy = jest.spyOn(metric, 'handleEvent');

      await helper.postCompletedEvent({
        latency,
      });
      await delay(10);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(metric.value).toBe(latency);
    });

    it('filters events by job names', async () => {
      const metric = new LatencyMetric({
        jobNames: ['valid'],
      });
      sut.registerMetric(metric);

      const spy = jest.spyOn(metric, 'handleEvent');

      await helper.postCompletedEvent({
        job: {
          name: 'invalid',
        },
      });
      await delay(10);
      expect(spy).not.toHaveBeenCalled();

      await helper.postCompletedEvent({
        job: {
          name: 'valid',
        },
      });
      await delay(10);
      expect(spy).toHaveBeenCalled();
    });

    it('emits an event after an event is handled by all associated metrics', async () => {
      const completed = new CompletedCountMetric({});
      const latencies = new LatencyMetric({});
      let count = 0;

      sut.registerMetric(completed);
      sut.registerMetric(latencies);

      let metrics: BaseMetric[];
      sut.onMetricsUpdated((event) => {
        metrics = event.metrics as BaseMetric[];
      });

      completed.onUpdate(() => {
        count++;
      });
      latencies.onUpdate(() => {
        count++;
      });

      await helper.postCompletedEvent({});
      await delay(10);
      expect(count).toBe(2);
      expect(metrics.length).toBe(2);
      expect(metrics.includes(completed)).toBe(true);
      expect(metrics.includes(latencies)).toBe(true);
    });
  });

  describe('polling metrics handling', () => {
    it('polls to periodically refresh metric values', async () => {
      jest.useFakeTimers();
      const timePeriod = ms('1 min');
      const metric = new JobRateMetric({
        timePeriod,
      });

      sut.registerMetric(metric);
      sut.start();

      const ts = Date.now();
      await helper.postFinishedEvent(true, {
        ts,
      });

      //await delay(10);

      const updateSpy = jest.spyOn(metric, 'checkUpdate');

      const rate = metric.value;
      const timerInterval = sut.calcTimerInterval();
      const newTs = ts + timerInterval + 1;

      await helper.postCompletedEvent({
        ts: newTs,
      });

      // Fast forward and exhaust only currently pending timers
      // (but not any new timers that get created during that process)
      jest.runOnlyPendingTimers();

      // await delay(1010);

      const newRate = metric.value;

      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(rate).not.toBe(newRate);
    });
  });
});
