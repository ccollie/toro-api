import { FailedCountMetric, MetricOptions, Events, BaseMetric } from '../../../src/server/metrics';
import { MetricTestHelper } from './metricTestHelper';

describe('FailedCountMetric', () => {
  const defaultOptions: MetricOptions = {};
  let testHelper: MetricTestHelper;

  afterEach(async () => {
    if (testHelper) {
      await testHelper.destroy();
    }
  })

  function ensureHelper(): MetricTestHelper {
    testHelper = testHelper || new MetricTestHelper();
    return testHelper;
  }

  function registerMetric(metric: BaseMetric) {
    ensureHelper().registerMetric(metric);
  }

  function complete() {
    return testHelper.emitCompletedEvent();
  }

  function fail() {
    return testHelper.emitFailedEvent({});
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
      const subject = new FailedCountMetric(defaultOptions);
      expect(subject).not.toBeUndefined();
    });

    test('subscribes to correct events', () => {
      const subject = new FailedCountMetric(defaultOptions);
      expect(subject.validEvents).toEqual([Events.FAILED]);
    });
  });

  describe('Updating', () => {
    test('can update count on failure', async () => {
      const data = [true, false, false, true, false];
      const subject = new FailedCountMetric(defaultOptions);
      registerMetric(subject);
      await updateValues(data);
      expect(subject.value).toBe(3);
    });
  });
});
