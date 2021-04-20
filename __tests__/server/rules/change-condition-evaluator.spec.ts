import { BaseMetric, LatencyMetric } from '../../../src/server/metrics';
import { ManualClock } from '../../../src/server/lib';
import random from 'lodash/random';
import { getRandomIntArray } from '../utils';
import {
  ChangeAggregationType,
  ChangeConditionOptions,
  ChangeTypeEnum,
  RuleOperator,
} from '../../../src/types';
import ms from 'ms';
import {
  ChangeConditionEvaluator,
  getAggregationFunction,
} from '../../../src/server/rules';

function getDiffs(
  prevWindow: number[],
  currentWindow: number[],
  usePercentage: boolean,
): number[] {
  const diffs: number[] = [];
  const len = Math.min(prevWindow.length, currentWindow.length);
  for (let i = 0; i < len; i++) {
    const prev = prevWindow[i];
    const current = currentWindow[i];
    if (prev !== undefined) {
      let delta = current - prev;
      if (usePercentage) {
        delta = prev === 0 ? 0 : delta / prev;
      }
      diffs.push(delta);
    }
  }
  return diffs;
}

function roundTimestamp(
  aggregator: ChangeConditionEvaluator,
  ts: number,
): number {
  return ts - (ts % aggregator.sampleInterval);
}

describe('ChangeConditionEvaluator', () => {
  let clock: ManualClock;
  let metric: BaseMetric;

  beforeEach(() => {
    const now = Date.now();
    clock = new ManualClock(now - (now % 1000));
    metric = new LatencyMetric({});
    metric.clock = clock;
  });

  function createInstance(
    opts: Partial<ChangeConditionOptions> = {},
  ): ChangeConditionEvaluator {
    const options: ChangeConditionOptions = {
      errorThreshold: 0,
      operator: RuleOperator.gte,
      changeType: ChangeTypeEnum.CHANGE,
      aggregationType: ChangeAggregationType.Max,
      windowSize: 10000,
      timeShift: 1000,
      ...opts,
    };
    return new ChangeConditionEvaluator(metric, options);
  }

  function addTestData(
    aggregator: ChangeConditionEvaluator,
  ): Record<string, number[]> {
    const count =
      Math.floor(aggregator.windowSize / aggregator.sampleInterval) * 2;
    const data = getRandomIntArray(count, 100, 0);
    data.forEach((x) => {
      aggregator.update(x);
      clock.advanceBy(aggregator.sampleInterval);
    });
    const prevStart = aggregator.previousWindowStart;
    const rangeStart = aggregator.minTimestamp;

    const prevWindow = aggregator.getPreviousWindow();
    const window = aggregator.getCurrentWindow();
    const diffs = getDiffs(prevWindow, window, aggregator.usePercentage);
    return {
      prevWindow,
      window,
      diffs,
    };
  }

  it('can construct an instance', () => {
    const instance = createInstance({
      errorThreshold: 0,
      operator: RuleOperator.gte,
      changeType: ChangeTypeEnum.CHANGE,
      aggregationType: ChangeAggregationType.Max,
      windowSize: 10000,
      timeShift: 1000,
    });

    expect(instance).toBeDefined();
    expect(instance.windowSize).toBe(10000);
    // expect(instance.timeShift).toBe(1000);
  });

  describe('window calculations', () => {
    it('calculates current window size', () => {
      let instance = createInstance({
        windowSize: 10000,
      });
    });

    it('calculates previous window start', () => {
      const WINDOW_SIZE = 7500;
      const TIME_SHIFT = 4500;

      let instance = createInstance({
        windowSize: WINDOW_SIZE,
        timeShift: TIME_SHIFT,
      });
      expect(instance.previousWindowStart).toBeLessThan(
        instance.currentWindowStart,
      );
      const diff = instance.currentWindowStart - instance.previousWindowStart;
      const expectedDiff = roundTimestamp(instance, WINDOW_SIZE + TIME_SHIFT);
      expect(diff).toEqual(expectedDiff);
    });
  });

  describe('.update', () => {
    it('returns 0 if window is not full', () => {
      const instance = createInstance();
      let value = instance.update(1);
      expect(value).toBe(0);

      value = instance.update(40);
      expect(value).toBe(0);
      clock.advanceBy(instance.fullWindowStart);
      value = instance.update(5);
      expect(value).toBe(40);
    });

    it('handles windowing of data', () => {
      const windowSize = ms('5 mins');
      const timeShift = windowSize;
      const instance = createInstance({ windowSize: windowSize, timeShift });
      const { prevWindow, window } = addTestData(instance);
      const instancePreviousWindow = instance.getPreviousWindow();
      const instanceCurrentWindow = instance.getCurrentWindow();
      expect(instancePreviousWindow).toStrictEqual(prevWindow);
      expect(instanceCurrentWindow).toStrictEqual(window);
    });

    it('handles windowing where timeShift < timeWindow', () => {
      const windowSize = ms('5 mins');
      const timeShift = windowSize;
      const instance = createInstance({ windowSize: windowSize, timeShift });
      const { prevWindow, window } = addTestData(instance);
      const instancePreviousWindow = instance.getPreviousWindow();
      const instanceCurrentWindow = instance.getCurrentWindow();
      expect(instancePreviousWindow).toStrictEqual(prevWindow);
      expect(instanceCurrentWindow).toStrictEqual(window);
    });

    function testAggregation(aggregationType: ChangeAggregationType): void {
      const calculate = getAggregationFunction(aggregationType);
      const windowSize = ms('5 mins');
      const instance = createInstance({
        windowSize,
        aggregationType,
      });
      const { diffs } = addTestData(instance);
      const instanceDiffs = instance.getDiffs();
      expect(diffs).toStrictEqual(instanceDiffs);
      const actual = calculate(diffs);
      expect(actual).toBe(instance.value);
    }

    it('calculates max', () => {
      testAggregation(ChangeAggregationType.Max);
    });

    it('calculates min', () => {
      testAggregation(ChangeAggregationType.Min);
    });

    it('calculates sum', () => {
      testAggregation(ChangeAggregationType.Sum);
    });

    it('calculates avg', () => {
      testAggregation(ChangeAggregationType.Avg);
    });
  });

  describe('count', () => {
    let instance: ChangeConditionEvaluator;
    let clock: ManualClock;
    let total: number;

    beforeEach(() => {
      clock = new ManualClock(0);
      instance = new ChangeConditionEvaluator(metric, {
        errorThreshold: 0,
        operator: RuleOperator.gte,
        changeType: ChangeTypeEnum.CHANGE,
        aggregationType: ChangeAggregationType.Max,
        windowSize: 10000,
        timeShift: 1000,
      });
      total = 0;
    });

    function update(count: number): void {
      for (let i = 0; i < count; i++) {
        const value = random(0, 99);
        instance.update(value);
      }
      total += count;
    }

    it('maintains a proper count', () => {
      const count = random(5, 50);
      update(count);
      expect(instance.count).toBe(count);
    });
  });

  describe('getPreviousWindow', () => {
    let instance;

    it('can get the previous window', () => {
      const instance = new ChangeConditionEvaluator(metric, {
        errorThreshold: 0,
        operator: RuleOperator.gte,
        changeType: ChangeTypeEnum.CHANGE,
        aggregationType: ChangeAggregationType.Max,
        windowSize: 10000,
        timeShift: 1000,
      });

      addTestData(instance);
      const { prevWindow, window } = addTestData(instance);
      const expected = instance.getPreviousWindow();
      expect(expected.length).toEqual(prevWindow.length);
    });
  });

  describe('getDiffs', () => {
    let instance;

    beforeEach(() => {
      instance = createInstance({
        aggregationType: ChangeAggregationType.Max,
        windowSize: 10000,
        timeShift: 1000,
      });
    });

    it('can correctly calculate diffs', async () => {
      addTestData(instance);
      const { prevWindow, window } = addTestData(instance);
      const instanceDiff = instance.getDiffs();
      expect(instanceDiff.length).toEqual(prevWindow.length);
    });
  });

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      const clock = new ManualClock(0);
      instance = createInstance({
        changeType: ChangeTypeEnum.CHANGE,
        aggregationType: ChangeAggregationType.Max,
        windowSize: 10000,
        timeShift: 1000,
      });
      metric.clock = clock;
    });

    it('generates a short description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, true);
      expect(actual).toBe('latency change');
    });

    it('generates a long description', () => {
      const metric = new LatencyMetric({});
      const actual = instance.getDescription(metric, false);
      expect(actual).toBe('change(latency, max, "10s")');
    });
  });
});
