/* global test, expect */
import { advanceBy, clear } from 'jest-date-mock';
import pMap from 'p-map';
import { random } from 'lodash';
import {
  JobRateMetric,
  RateMetricOptions,
  DefaultRateMetricOptions,
  Events,
} from '@src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';
import { getRandomNumberArray } from './helpers';

const EVENT_NAME = Events.FINISHED;

describe('JobRateMetric', () => {
  let helper: MetricTestHelper;
  const defaultOptions: RateMetricOptions = DefaultRateMetricOptions;

  afterEach(async () => {
    if (helper) {
      await helper.destroy();
    }
  });

  async function updateValues(data: boolean[]) {
    return pMap(data, (success) => {
      return helper.emitFinishedEvent(success, {
        ts: Date.now(),
      });
    });
  }

  describe('constructor', () => {
    test('can create with default options', () => {
      const subject = new JobRateMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test(`subscribes to the "${EVENT_NAME}" event`, () => {
      const subject = new JobRateMetric(defaultOptions);
      expect(subject.validEvents).toStrictEqual([EVENT_NAME]);
    });
  });

  describe('Updating', () => {
    test('properly updates simple values', async () => {
      const data = getRandomNumberArray(5);
      const subject = new JobRateMetric(defaultOptions);
      helper = MetricTestHelper.forMetric(subject);
      await pMap(data, (latency) => {
        return helper.emitFinishedEvent(true, {
          ts: Date.now(),
          latency,
        });
      });
      expect(subject.value).toBe(data[data.length - 1]);
    });
  });

  describe('Triggering', () => {
    test('triggers an "update" event when a job is finished', async () => {
      const subject = new JobRateMetric(defaultOptions);
      helper = MetricTestHelper.forMetric(subject);
      let eventTriggered = false;
      subject.onUpdate(() => (eventTriggered = true));
      await helper.emitFinishedEvent(true, {
        ts: Date.now(),
        latency: 100,
      });
      expect(eventTriggered).toBe(true);
    });
  });

  describe('functionality', () => {
    let metric: JobRateMetric;
    let helper: MetricTestHelper;

    beforeEach(() => {
      metric = new JobRateMetric({
        timePeriod: 5000,
        interval: 500,
      });
      helper = MetricTestHelper.forMetric(metric);
    });

    afterEach(async () => {
      metric.destroy();
      await helper.destroy();
      clear();
    });

    function setCompletion(success: boolean): Promise<void> {
      return helper.emitFinishedEvent(success, {
        ts: Date.now(),
        latency: random(10, 5000),
      });
    }

    const failure = (): Promise<void> => setCompletion(false);
    const success = (): Promise<void> => setCompletion(true);

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
  });
});
