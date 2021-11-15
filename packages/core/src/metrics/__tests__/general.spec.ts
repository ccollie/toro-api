import { RedisMetric } from '../redisMetrics';
import {
  BaseMetric,
  JobSpotCountMetric,
  MaxAggregator,
  NullAggregator,
  createMetric as _createMetric,
  metricsMap,
  MetricConstructor,
  ApdexMetric,
  MetricTypes,
  isTypeOfMetric,
  QueueBasedMetric,
  RateMetric,
} from '../';
import type { RateMetricOptions } from '../';
import { random } from 'lodash';
import { systemClock, delay } from '../../lib';
import { nanoid } from 'nanoid';
import { getStaticProp } from '@alpen/shared';

function createMetric(type: MetricConstructor): BaseMetric {
  const metricType = (type as any)['key'] as MetricTypes;
  if (metricType === MetricTypes.Apdex) {
    return new ApdexMetric({ threshold: 400 });
  }
  if (isTypeOfMetric(type, RedisMetric)) {
    return _createMetric(metricType, { sampleInterval: 2000 });
  } else if (type instanceof QueueBasedMetric) {
    const options = {
      sampleInterval: 5000,
      jobNames: ['rinse', 'lather', 'repeat'],
    };
    return _createMetric(metricType, options);
  } else if (isTypeOfMetric(type, JobSpotCountMetric)) {
    return _createMetric(metricType, { sampleInterval: 1000 });
  } else if (isTypeOfMetric(type, RateMetric)) {
    const options: RateMetricOptions = {
      sampleInterval: 5000,
      timePeriod: 10000,
      jobNames: ['rinse', 'lather', 'repeat'],
    };
    return _createMetric(metricType, options);
  }
  return _createMetric(metricType, {});
}

const testData = Object.keys(metricsMap)
  .filter((key) => !!metricsMap[key])
  .map((key) => {
    const className = `${key}Metric`;
    const type = metricsMap[key];
    return { className, type };
  });

describe('General', () => {
  describe('aggregator', () => {
    testData.forEach(({ className, type }) => {
      describe(`${className}`, () => {
        let metric: BaseMetric;

        beforeEach(() => {
          metric = createMetric(type);
        });

        afterEach(() => {
          metric.destroy();
        });

        it(`${className} defaults to a NullAggregator`, () => {
          expect(metric.aggregator).toBeInstanceOf(NullAggregator);
        });

        it('can set the aggregator', () => {
          metric.aggregator = new MaxAggregator();
          expect(metric.aggregator).toBeInstanceOf(MaxAggregator);
        });

        test('setting the aggregator to null causes it to default to a NullAggregator', () => {
          metric.aggregator = new MaxAggregator();
          expect(metric.aggregator).toBeInstanceOf(MaxAggregator);
          metric.aggregator = null;
          expect(metric.aggregator).toBeInstanceOf(NullAggregator);
        });

        it('modifies the metric value on update', () => {
          const count = random(5, 20);
          metric.aggregator = new MaxAggregator();
          let max = -1;
          for (let i = 0; i < count; i++) {
            const value = random(0, 1000);
            max = Math.max(max, value);
            const actual = metric.update(value);
            expect(actual).toBe(max);
            expect(metric.value).toBe(max);
          }
        });
      });
    });
  });

  describe('update', () => {
    testData.forEach(({ className, type }) => {
      describe(`${className}`, () => {
        let metric: BaseMetric;

        beforeEach(() => {
          metric = createMetric(type);
        });

        afterEach(() => {
          metric.destroy();
        });

        it('does not transform value by default', () => {
          const count = random(5, 20);
          for (let i = 0; i < count; i++) {
            const value = random(0, 1000);
            const actual = metric.update(value);
            expect(actual).toBe(value);
            expect(metric.value).toBe(value);
          }
        });

        it('emits an event when the value is changed', async () => {
          let updateCount = 0;
          metric.update(10);

          metric.onUpdate(() => {
            updateCount++;
          });
          const count = random(1, 5);
          for (let i = 0; i < count; i++) {
            metric.update(random(0, 99));
          }

          await delay(20);
          expect(updateCount).toBe(count);
        });

        it('update event contains the value and timestamp', async () => {
          let ts = null;
          let value = -1;

          metric.onUpdate((event: any) => {
            ts = event.ts;
            value = event.value;
          });

          metric.update(random(0, 99));

          const now = systemClock.getTime();

          await delay(10);
          expect(now - ts).toBeLessThan(50);
          expect(metric.value).toBe(value);
        });
      });
    });
  });

  describe('toJSON', () => {
    testData.forEach(({ className, type }) => {
      describe(`${className}`, () => {
        let metric: BaseMetric;

        beforeEach(() => {
          metric = createMetric(type);
          metric.id = nanoid();
          metric.isActive = true;
          metric.description = 'Fabulous !!! ' + nanoid();
          metric.aggregator = new MaxAggregator({
            duration: 40000,
            granularity: 4000,
          });
        });

        afterEach(() => {
          metric.destroy();
        });

        it('can serialize to JSON', () => {
          const key = getStaticProp(metric, 'key');
          const json = metric.toJSON();

          const aggregator = metric.aggregator.toJSON();
          // hack: options is protected
          const options = (metric as any).options;
          expect(json).toBeDefined();
          expect(json.type).toBe(key);
          expect(json).toMatchObject({
            id: metric.id,
            createdAt: metric.createdAt,
            updatedAt: metric.createdAt,
            name: metric.name,
            description: metric.description,
            isActive: metric.isActive,
            options,
            aggregator,
          });
        });
      });
    });
  });
});
