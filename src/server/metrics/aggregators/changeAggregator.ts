import ms from 'ms';
import { Clock, getStaticProp } from '../../lib';
import { BaseAggregator } from './aggregator';
import { ChunkedAssociativeArray, TimeTicker } from '../lib';
import { BaseMetric } from '../baseMetric';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../../validation/schemas';
import { DDSketch } from 'sketches-js';
import { clearDDSketch } from './utils';
import {
  ChangeAggregationType,
  ThresholdCondition,
  ChangeConditionOptions,
} from '../../../types';
import { calculateInterval } from '../lib/utils';

const TRIM_THRESHOLD = 4;

type AggregateFunction = (data: number[]) => number;

function percentileFactory(percentile: number): AggregateFunction {
  const sketch = new DDSketch({ alpha: 0.005 });
  return (data: number[]): number => {
    data.forEach((value) => sketch.add(value));
    const result = sketch.getValueAtPercentile(percentile);
    clearDDSketch(sketch);
    return result;
  };
}

export type ChangeAggregatorOptions = Omit<
  ChangeConditionOptions,
  keyof ThresholdCondition
> & {
  usePercentage?: boolean;
};

const optionsSchema = Joi.object().keys({
  windowSize: DurationSchema,
  timeShift: DurationSchema,
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

export class ChangeAggregator extends BaseAggregator {
  protected readonly options: ChangeAggregatorOptions;

  private _isFullWindow = false;
  private _value: number = undefined;
  private _count = 0;
  private readonly fullWindowStart: number;
  public readonly fullWindow: number;
  public readonly sampleInterval: number;
  private readonly measurements: ChunkedAssociativeArray<number, number>;
  private readonly calculationMethod: AggregateFunction;
  private readonly ticker: TimeTicker;

  constructor(clock: Clock, options: ChangeAggregatorOptions) {
    super(clock);
    this.options = { ...options };
    // eslint-disable-next-line prefer-const
    let { timeShift = options.timeShift, timeWindow } = options;

    this.sampleInterval = calculateInterval(timeWindow);
    this.options.timeShift = timeShift;
    this.measurements = new ChunkedAssociativeArray<number, number>();

    this.ticker = new TimeTicker(this.sampleInterval, clock);

    this.fullWindow = timeWindow + timeShift;

    this.fullWindowStart = clock.getTime() + this.fullWindow;
    this.calculationMethod = getAggregationFunction(
      this.options.aggregationType,
    );
  }

  get windowSize(): number {
    return this.options.timeWindow;
  }

  get timeShift(): number {
    return this.options.timeShift;
  }

  get usePercentage(): boolean {
    return this.options.usePercentage;
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
    return this.now - this.windowSize;
  }

  get previousWindowStart(): number {
    return this.currentWindowStart - this.timeShift;
  }

  private align(ts: number): number {
    return ts - (ts % this.sampleInterval);
  }

  private trim() {
    if (this.isFullWindow) {
      const start = this.now - this.fullWindow;
      this.measurements.trim(start);
    }
  }

  getNormalizedRange(start: number): Record<number, number> {
    const result: Record<number, number> = Object.create(null);
    start = this.align(start);
    const end = start + this.windowSize - 1;
    for (const [ts, value] of this.measurements.range(start, end)) {
      const normalizedTs = ts - start;
      result[normalizedTs] = value;
    }
    return result;
  }

  getCurrentWindow(): Record<number, number> {
    return this.getNormalizedRange(this.currentWindowStart);
  }

  getPreviousWindow(): Record<number, number> {
    return this.getNormalizedRange(this.previousWindowStart);
  }

  getDiffs(): number[] {
    const usePercentage = this.options.usePercentage;

    const previous = this.getCurrentWindow();
    const current = this.getPreviousWindow();

    const keys = new Set<string>(
      Object.keys(previous).concat(Object.keys(current)),
    );

    const diffs = [];
    keys.forEach((key) => {
      const prevValue = previous[key];
      const curValue = current[key];
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

    if (this.ticker.tickIfNeeded() === 0) {
      return this._value;
    }

    if (this._count % TRIM_THRESHOLD == 0) {
      this.trim();
    }

    const diffs = this.getDiffs();

    return (this._value = this.calculationMethod(diffs));
  }

  update(value: number): number {
    // for comparison, align timestamps. Of course the assumption is that
    // we are updating at intervals of this.sampleInterval
    const ts = this.align(this.now);
    this.measurements.put(ts, value);
    this._count++;
    return this.getChange();
  }

  get value(): number {
    return this._value;
  }

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    return {
      type,
      options: {
        ...this.options,
      },
    };
  }

  get count(): number {
    return this._count;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return `${type} change`;
    }
    const time = ms(this.windowSize);
    return `change(${type}, ${this.options.aggregationType}, "${time}")`;
  }

  static get key(): string {
    return 'change';
  }

  static get description(): string {
    return 'Change';
  }

  static get schema(): ObjectSchema {
    return optionsSchema;
  }
}

export function getAggregationFunction(
  aggregationType: ChangeAggregationType,
): (data: number[]) => number {
  switch (aggregationType) {
    case ChangeAggregationType.Avg:
      return (data: number[]): number => {
        const total = data.reduce((res, value) => res + value, 0);
        return data.length ? total / data.length : 0;
      };
    case ChangeAggregationType.Max:
      return (data: number[]): number => Math.max(...data);
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
