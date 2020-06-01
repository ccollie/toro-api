import { ChangeAggregator, ChangeAggregatorOptions } from '../../../../src/server/metrics/aggregators';
import { ManualClock, systemClock } from '../../../../src/server/lib';
import { LatencyMetric } from '../../../../src/server/metrics';
import random from 'lodash/random';
import { getRandomIntArray } from '../../utils';
import { ChangeAggregationType } from '../../../../src/types';
import ms = require('ms');
import { getAggregationFunction } from '../../../../src/server/metrics/aggregators/changeAggregator';

function getDiffs(prevWindow: number[], currentWindow: number[], usePercentage: boolean): number[] {
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

function roundTimestamp(aggregator: ChangeAggregator, ts: number): number {
  return ts - (ts % aggregator.sampleInterval);
}

describe('ChangeAggregator', () => {
  let clock: ManualClock;

  beforeEach(() => {
    clock = new ManualClock(0);
  });

  function createInstance(opts: Partial<ChangeAggregatorOptions> = {}): ChangeAggregator {
    const options = {
      aggregationType: ChangeAggregationType.Max,
      timeWindow: 10000,
      timeShift: 1000,
      ...opts
    }
    return new ChangeAggregator(clock, options);
  }

  function addTestData(aggregator: ChangeAggregator): Record<string, number[]> {
    const count = Math.floor(aggregator.windowSize / aggregator.sampleInterval);
    const prevWindow = getRandomIntArray(count, 100, 0);
    const window = getRandomIntArray(count, 100, 0);
    prevWindow.forEach((x) => {
      aggregator.update(x);
      clock.advanceBy(aggregator.sampleInterval);
    });
    window.forEach((x) => {
      aggregator.update(x);
      clock.advanceBy(aggregator.sampleInterval);
    });
    const diffs = getDiffs(prevWindow, window, aggregator.usePercentage).sort();
    return {
      prevWindow,
      window,
      diffs
    }
  }

  it('can construct an instance', () => {
    const instance = new ChangeAggregator(systemClock, {
      aggregationType: ChangeAggregationType.Max,
      timeWindow: 10000,
      timeShift: 1000
    });

    expect(instance).toBeDefined();
    expect(instance.windowSize).toBe(10000);
    // expect(instance.timeShift).toBe(1000);
  })

  describe('.update', () => {

    it('returns 0 if window is not full', () => {
      const instance = createInstance();
      let value = instance.update(1);
      expect(value).toBe(0);

      value = instance.update(40);
      expect(value).toBe(40);
      value = instance.update(5);
      expect(value).toBe(40);
    });

    function extractValues(map: Record<string, number>): number[] {
      const keys = Object.keys(map);
      return keys.reduce((res, key) => res.concat(map[key]), []).sort();
    }

    it('handles windowing of data', () => {
      const windowSize = ms('5 mins');
      const timeShift = windowSize;
      const instance = createInstance({ timeWindow: windowSize, timeShift });
      const { prevWindow, window } = addTestData(instance);
      const instancePreviousWindow = extractValues( instance.getPreviousWindow() );
      const instanceCurrentWindow = extractValues( instance.getCurrentWindow() );
      expect(instancePreviousWindow).toEqual(prevWindow.sort());
      expect(instanceCurrentWindow).toEqual(window.sort());
    });

    it('handles windowing where timeShift < timeWindow', () => {
      const windowSize = ms('5 mins');
      const timeShift = windowSize;
      const instance = createInstance({ timeWindow: windowSize, timeShift });
      const { prevWindow, window } = addTestData(instance);
      const instancePreviousWindow = extractValues( instance.getPreviousWindow() );
      const instanceCurrentWindow = extractValues( instance.getCurrentWindow() );
      expect(instancePreviousWindow).toEqual(prevWindow.sort());
      expect(instanceCurrentWindow).toEqual(window.sort());
    });

    function testAggregation(aggregationType: ChangeAggregationType): void {
      const calculate = getAggregationFunction(aggregationType);
      const windowSize = ms('5 mins');
      const instance = createInstance({ timeWindow: windowSize, aggregationType });
      const { diffs } = addTestData(instance);
      const instanceDiffs = instance.getDiffs().sort();
      expect(diffs).toStrictEqual(instanceDiffs);
      const actual = calculate(diffs);
      expect(actual).toBe( instance.value );
    }

    it('calculates max', () => {
      testAggregation(ChangeAggregationType.Max);
    });

    it('calculates min', () => {
      testAggregation(ChangeAggregationType.Max);
    });

    it('calculates sum', () => {
      testAggregation(ChangeAggregationType.Max);
    });

    it('calculates avg', () => {
      testAggregation(ChangeAggregationType.Avg);
    });

  });

  describe('count', () => {
    let instance: ChangeAggregator;
    let clock: ManualClock;
    let total: number;

    beforeEach(() => {
      clock = new ManualClock(0);
      instance = new ChangeAggregator(clock, {
        aggregationType: ChangeAggregationType.Max,
        timeWindow: 10000,
        timeShift: 1000
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

  describe('getDescription', () => {
    let instance;

    beforeEach(() => {
      const clock = new ManualClock(0);
      instance = new ChangeAggregator(clock, {
        aggregationType: ChangeAggregationType.Max,
        timeWindow: 10000,
        timeShift: 1000
      });
    })

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
