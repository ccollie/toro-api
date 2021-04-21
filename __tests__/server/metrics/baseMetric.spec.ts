import {
  BaseMetric,
  Events,
  MaxAggregator,
  MetricOptions,
  NullAggregator,
} from '../../../src/server/metrics';
import { delay, randomString } from '../utils';
import { createJobEvent } from '../../factories';
import { random } from 'lodash';
import { systemClock } from '../../../src/server/lib';

function getRandomStringArray(len = 4): string[] {
  const result = new Array<string>(len);
  for (let i = 0; i < len; i++) {
    result[i] = randomString(6);
  }
  return result;
}

function getStaticProp(metric: object, name: string): any {
  return (metric.constructor as any)[name];
}

function getKey(metric: BaseMetric): string {
  return getStaticProp(metric, 'key');
}

describe('BaseMetric', () => {
  describe('constructor', () => {
    it('can construct an object with empty parameters', () => {
      const metric = new BaseMetric({});
      expect(metric).toBeDefined();
      expect(metric.id).toBeDefined();
      expect(metric.jobNames).toStrictEqual([]);
      expect(metric.name).not.toBeDefined();
    });

    it('copies values from constructor args', () => {
      const options: MetricOptions = {
        id: randomString(),
        name: randomString(),
        jobNames: getRandomStringArray(),
      };
      const metric = new BaseMetric(options);
      expect(metric.id).toBe(options.id);
      expect(metric.jobNames).toStrictEqual(options.jobNames);
      expect(metric.name).toBe(options.name);
    });
  });

  describe('accept', () => {
    it('allows all jobs if no job names is specified', () => {
      const event = createJobEvent(Events.FAILED);
      const metric = new BaseMetric({});
      expect(metric.accept(event)).toBeTruthy();
    });

    it('filters events according to job names', () => {
      const validJobNames = ['valid', 'job', 'name'];
      const options: MetricOptions = {
        id: randomString(),
        name: randomString(),
        jobNames: validJobNames,
      };
      const metric = new BaseMetric(options);

      const validateName = (name: string, shouldAccept: boolean) => {
        const event = createJobEvent(Events.COMPLETED, {
          job: {
            name,
          },
        });
        expect(metric.accept(event)).toBe(shouldAccept);
      };

      options.jobNames.forEach((name) => validateName(name, true));

      ['stupendous', 'fungal', 'tiddly-bop'].forEach((name) =>
        validateName(name, false),
      );
    });
  });

  describe('aggregator', () => {
    let metric: BaseMetric;

    beforeEach(() => {
      metric = new BaseMetric({});
    });

    afterEach(() => {
      metric.destroy();
    });

    it('defaults to a NullAggregator', () => {
      expect(metric.aggregator).toBeInstanceOf(NullAggregator);
    });

    it('can be set', () => {
      metric.aggregator = new MaxAggregator(systemClock);
      expect(metric.aggregator).toBeInstanceOf(MaxAggregator);
    });

    it('setting to null causes it to default to a NullAggregator', () => {
      metric.aggregator = null;
      expect(metric.aggregator).toBeInstanceOf(NullAggregator);
    });

    it('modifies the metric value on update', () => {
      const count = random(5, 20);
      metric.aggregator = new MaxAggregator(systemClock);
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

  describe('update', () => {
    let metric: BaseMetric;

    beforeEach(() => {
      metric = new BaseMetric({});
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

  describe('serialization', () => {
    it('can serialize to json', () => {
      const options: MetricOptions = {
        id: randomString(),
        name: randomString(),
        jobNames: getRandomStringArray(),
      };
      const metric = new BaseMetric(options);
      const key = getKey(metric);
      const json = metric.toJSON();
      expect(json).toBeDefined();
      expect(json.type).toBe(key);
      expect(json.options).toStrictEqual(options);
    });
  });
});
