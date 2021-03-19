import { ChunkedAssociativeArray } from '../lib';
import { BaseMetric } from '../metrics/baseMetric';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../validation/schemas';
import { DDSketch } from 'sketches-js';
import { clearDDSketch, calculateInterval } from '../stats/utils';
import {
  ChangeAggregationType,
  ChangeConditionOptions,
  RuleType,
  ErrorLevel,
} from '../../types';
import { ThresholdConditionEvaluator } from './condition-evaluator';

const TRIM_THRESHOLD = 10;

export type AggregateFunction = (data: number[]) => number;

function percentileFactory(percentile: number): AggregateFunction {
  const sketch = new DDSketch({ alpha: 0.005 });
  return (data: number[]): number => {
    data.forEach((value) => sketch.add(value));
    const result = sketch.getValueAtPercentile(percentile);
    clearDDSketch(sketch);
    return result;
  };
}

const optionsSchema = Joi.object().keys({
  windowSize: DurationSchema,
  timeShift: DurationSchema,
  sampleInterval: DurationSchema.optional(),
  usePercentage: Joi.boolean().optional().default(true),
  aggregationType: Joi.string()
    .valid(
      ChangeAggregationType.Avg,
      ChangeAggregationType.Min,
      ChangeAggregationType.Max,
      ChangeAggregationType.P90,
      ChangeAggregationType.P95,
      ChangeAggregationType.P99,
      ChangeAggregationType.Sum,
    )
    .default(ChangeAggregationType.Avg),
});

export class ChangeConditionEvaluator extends ThresholdConditionEvaluator {
  private _isFullWindow = false;
  private _value: number = undefined;
  private _count = 0;
  private _lastTick: number;
  private readonly measurements: ChunkedAssociativeArray<number, number>;
  private readonly aggregationType: ChangeAggregationType;
  private readonly calculationMethod: AggregateFunction;

  public readonly windowSize: number;
  public readonly timeShift: number;
  public readonly fullWindowStart: number;
  public readonly fullWindow: number;
  public readonly sampleInterval: number;
  public readonly usePercentage: boolean;

  constructor(metric: BaseMetric, options: ChangeConditionOptions) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    // eslint-disable-next-line prefer-const
    let { timeShift, windowSize, sampleInterval } = options;

    this.windowSize = windowSize;
    this.sampleInterval =
      typeof sampleInterval === 'number'
        ? sampleInterval
        : calculateInterval(windowSize);
    this.timeShift = timeShift ?? windowSize;
    this.measurements = new ChunkedAssociativeArray<number, number>();

    this.fullWindow = windowSize + timeShift;
    this.fullWindowStart = this.clock.getTime() + this.fullWindow;
    this.calculationMethod = getAggregationFunction(options.aggregationType);
    this.aggregationType = options.aggregationType;
    this.usePercentage = options.changeType === 'PCT';
  }

  protected evaluateThreshold(value: number): ErrorLevel {
    const val = this.update(value);
    return super.evaluateThreshold(val);
  }

  protected handleEval(value: number): ErrorLevel {
    const change = this.update(value);
    const result = super.handleEval(change);
    this.state['ruleType'] = RuleType.CHANGE;
    return result;
  }

  private get now(): number {
    return this.clock.getTime();
  }

  public get isFullWindow(): boolean {
    return (
      this._isFullWindow ||
      (this._isFullWindow = this.now >= this.fullWindowStart)
    );
  }

  get currentWindowStart(): number {
    return this.align(this.now - this.windowSize);
  }

  get previousWindowStart(): number {
    const start = this.currentWindowStart - this.timeShift - this.windowSize;
    return this.align(start);
  }

  private align(ts: number): number {
    return ts - (ts % this.sampleInterval);
  }

  private trim() {
    if (this.isFullWindow) {
      const fudge = Math.floor(this.windowSize / this.sampleInterval) * 2;
      const start = this.align(this.previousWindowStart - fudge);
      this.measurements.trim(start);
    }
  }

  getNormalizedRange(start: number): number[] {
    const result = [];
    start = this.align(start);
    const end = start + this.windowSize - 1;
    const interval = this.sampleInterval;
    // It _is_ expected that we can have sparse arrays
    for (const [ts, value] of this.measurements.range(start, end)) {
      const normalizedTs = (ts - start) / interval;
      result[normalizedTs] = value;
    }
    return result;
  }

  getCurrentWindow(): number[] {
    return this.getNormalizedRange(this.currentWindowStart);
  }

  getPreviousWindow(): number[] {
    return this.getNormalizedRange(this.previousWindowStart);
  }

  getDiffs(): number[] {
    const usePercentage = this.usePercentage;

    const previous = this.getPreviousWindow();
    const current = this.getCurrentWindow();

    // TODO: have param for default value

    const diffs = [];
    current.forEach((curValue, index) => {
      const prevValue = previous[index];
      if (prevValue !== undefined) {
        let delta = curValue - prevValue;
        if (usePercentage) {
          delta = prevValue === 0 ? 0 : delta / prevValue;
        }
        diffs.push(delta);
      }
    });

    return diffs;
  }

  getChange(): number {
    if (!this.isFullWindow) {
      return 0;
    }

    const now = this.now;
    if (now - (this._lastTick ?? now) < this.sampleInterval) {
      return this._value;
    }

    const diffs = this.getDiffs();

    return !diffs.length ? 0 : this.calculationMethod(diffs);
  }

  update(value: number): number {
    // for comparison, align timestamps. Of course the assumption is that
    // we are updating at intervals of this.sampleInterval
    const ts = this.align(this.now);
    this.measurements.put(ts, value);
    if (++this._count % TRIM_THRESHOLD == 0) {
      if (ts - this.measurements.firstKey > this.fullWindow) {
        this.trim();
        this._count = this.measurements.size();
      }
    }
    this._value = this.getChange();
    this._lastTick = ts;
    return this._value;
  }

  get value(): number {
    return this._value;
  }

  // Testing Only
  getValues(start?: number, end?: number): number[] {
    return this.measurements.getValues(start, end);
  }

  get minTimestamp(): number {
    return this.measurements.firstKey;
  }

  get maxTimestamp(): number {
    return this.measurements.lastKey;
  }

  get count(): number {
    return this._count;
  }

  static get schema(): ObjectSchema {
    return optionsSchema;
  }
}

export function getAggregationFunction(
  aggregationType: ChangeAggregationType,
): AggregateFunction {
  switch (aggregationType) {
    case ChangeAggregationType.Avg:
      return (data: number[]): number => {
        const total = data.reduce((res, value) => res + value, 0);
        return data.length ? total / data.length : 0;
      };
    case ChangeAggregationType.Max:
      return (data: number[]) => Math.max(...data);
    case ChangeAggregationType.Min:
      return (data: number[]) => Math.min(...data);
    case ChangeAggregationType.Sum:
      return (data: number[]) => data.reduce((res, value) => res + value, 0);
    case ChangeAggregationType.P90:
      return percentileFactory(0.9);
    case ChangeAggregationType.P95:
      return percentileFactory(0.95);
    case ChangeAggregationType.P99:
      return percentileFactory(0.99);
  }
}
