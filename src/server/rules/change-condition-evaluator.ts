import { ChunkedAssociativeArray, systemClock } from '../lib';
import { BaseMetric } from '@server/metrics';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../validation/schemas';
import { DDSketch } from '@datadog/sketches-js';
import { calculateInterval } from '../stats/utils';
import {
  ChangeAggregationType,
  ChangeConditionOptions,
  ChangeRuleEvaluationState,
  ChangeTypeEnum,
  ErrorLevel,
  RuleEvaluationState,
  RuleType,
} from '../../types';
import { ThresholdConditionEvaluator } from './condition-evaluator';

const TRIM_THRESHOLD = 15;

export type AggregateFunction = (data: number[]) => number;

function percentileFactory(percentile: number): AggregateFunction {
  return (data: number[]): number => {
    const sketch = new DDSketch();
    data.forEach((value) => sketch.accept(value));
    return sketch.getValueAtQuantile(percentile);
  };
}

const optionsSchema = Joi.object().keys({
  windowSize: DurationSchema,
  timeShift: DurationSchema.optional(),
  sampleInterval: DurationSchema.optional(),
  changeType: Joi.string()
    .valid(ChangeTypeEnum.CHANGE, ChangeTypeEnum.PCT)
    .default(ChangeTypeEnum.CHANGE),
  aggregationType: Joi.string()
    .valid(
      ChangeAggregationType.AVG,
      ChangeAggregationType.MIN,
      ChangeAggregationType.MAX,
      ChangeAggregationType.P90,
      ChangeAggregationType.P95,
      ChangeAggregationType.P99,
      ChangeAggregationType.SUM,
    )
    .default(ChangeAggregationType.AVG),
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
  public readonly fullWindow: number;
  public readonly sampleInterval: number;
  public readonly usePercentage: boolean;

  constructor(metric: BaseMetric, options: ChangeConditionOptions) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    const { timeShift, windowSize, sampleInterval } = options;

    this.windowSize = windowSize;
    // TODO: validate sampleInterval
    this.sampleInterval = sampleInterval ?? calculateInterval(windowSize);
    this.timeShift = timeShift ?? windowSize;
    this.measurements = new ChunkedAssociativeArray<number, number>();

    this.fullWindow = 2 * windowSize + timeShift;
    this.calculationMethod = getAggregationFunction(options.aggregationType);
    this.aggregationType = options.aggregationType;
    this.usePercentage = options.changeType === ChangeTypeEnum.CHANGE;
  }

  protected getState(level: ErrorLevel, value: number): RuleEvaluationState {
    const baseState = super.getState(level, value);
    return {
      ...baseState,
      ruleType: RuleType.CHANGE,
      changeType: this.usePercentage
        ? ChangeTypeEnum.PCT
        : ChangeTypeEnum.CHANGE,
      windowSize: this.windowSize,
      timeShift: this.timeShift,
      aggregation: this.aggregationType,
    } as ChangeRuleEvaluationState;
  }

  protected handleEval(value: number): ErrorLevel {
    const change = this.update(value);
    return super.handleEval(change);
  }

  get lastTimestamp(): number {
    return this.measurements.lastKey ?? 0;
  }

  public get isFullWindow(): boolean {
    if (this._isFullWindow) return true;
    if (this._lastTick === undefined) return false;
    const firstTs = this.measurements.firstKey ?? 0;
    this._isFullWindow = this.lastTimestamp - firstTs >= this.fullWindow;
    return this._isFullWindow;
  }

  get currentWindowStart(): number {
    return this.align(this.lastTimestamp - this.windowSize);
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
    // It _is_ expected that we can generate sparse arrays here
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

    const now = this.lastTimestamp;
    if (now - (this._lastTick ?? now) < this.sampleInterval) {
      return this._value;
    }

    const diffs = this.getDiffs();

    return !diffs.length ? 0 : this.calculationMethod(diffs);
  }

  update(value: number, ts?: number): number {
    // for comparison, align timestamps. Of course the assumption is that
    // we are updating at intervals of this.sampleInterval
    ts = this.align(ts ?? systemClock.getTime());
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
    case ChangeAggregationType.AVG:
      return (data: number[]): number => {
        const total = data.reduce((res, value) => res + value, 0);
        return data.length ? total / data.length : 0;
      };
    case ChangeAggregationType.MAX:
      return (data: number[]) => Math.max(...data);
    case ChangeAggregationType.MIN:
      return (data: number[]) => Math.min(...data);
    case ChangeAggregationType.SUM:
      return (data: number[]) => data.reduce((res, value) => res + value, 0);
    case ChangeAggregationType.P90:
      return percentileFactory(0.9);
    case ChangeAggregationType.P95:
      return percentileFactory(0.95);
    case ChangeAggregationType.P99:
      return percentileFactory(0.99);
  }
}
