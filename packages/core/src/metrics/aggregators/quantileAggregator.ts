import Joi, { ObjectSchema } from 'joi';
import baseSchema from '../slidingWindowBaseSchema';
import { Metric } from '../metric';
import {
  AggregatorTypes,
  SerializedAggregator,
  SlidingWindowOptions,
} from '../../types';
import { DDSketch } from '@datadog/sketches-js';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';
import { ordinal, round } from '@alpen/shared';
import { getMetricTypeName } from './utils';

function quantileToString(q: number): string {
  return 'p' + (q * 100).toString(10).replace('.', '');
}

export interface QuantileAggregatorOptions {
  duration: number;
  /**
   * the quantile as a fraction, e.g. 0.5 for the mean
   */
  quantile: number;
  /**
   * the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)
   */
  alpha?: number;
}

function makeEstimator(options?: QuantileAggregatorOptions): DDSketch {
  return new DDSketch({ relativeAccuracy: options.alpha });
}

const QuantileAggregatorSchema = baseSchema.keys({
  alpha: Joi.number()
    .description(
      'the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)',
    )
    .min(0)
    .max(1.0)
    .default(0.05),
  quantile: Joi.number()
    .description('the quantile as a fraction, e.g. 0.5 for the mean')
    .min(0)
    .max(1.0),
});

/**
 * An aggregator which calculates a quantile over streaming data with configurable accuracy
 */
export class QuantileAggregator extends SlidingTimeWindowAggregator {
  private accumulator: DDSketch;

  /**
   * Construct a SlidingWindowQuantileAggregator
   * @param options
   * @param {Number} options.alpha
   * @param {Number} options.quantile the desired quantile (0.0 - 1)
   */
  constructor(options?: QuantileAggregatorOptions) {
    super({
      duration: 0,
      quantile: 0.5,
      alpha: 0.05,
      ...(options || {}),
    });
    this.accumulator = this.createSketch();
  }

  protected createSketch(): DDSketch {
    return makeEstimator(this.options as QuantileAggregatorOptions);
  }

  static get schema(): ObjectSchema {
    return QuantileAggregatorSchema;
  }

  getDescription(metric: unknown, short = false): string {
    const type = getMetricTypeName(metric);
    let q = round(this.quantile, 2);
    if (short) {
      const str = quantileToString(q);
      return `${str}(${type})`;
    }
    q = q * 100;
    return `${type} ${ordinal(q)} percentile`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Quantile;
  }

  static get description(): string {
    return 'Quantile';
  }

  get quantile(): number {
    return (this.options as QuantileAggregatorOptions).quantile;
  }

  get alpha(): number {
    return (this.options as QuantileAggregatorOptions).alpha;
  }

  protected onTick(): void {
    this.accumulator = this.createSketch();
    const values = this.getCurrentValues();
    this._count = values.length;
    values.forEach((value) => this.accumulator.accept(value));
  }

  protected handleUpdate(value: number): number {
    this.accumulator.accept(value);
    return this.accumulator.getValueAtQuantile(this.quantile);
  }

  toJSON(): SerializedAggregator {
    const type = (this.constructor as any).key;
    const options = { ...this.options };
    return {
      type,
      options,
    };
  }
}

/// Convenience percentile metrics

const SpecificPercentileSchema = baseSchema.keys({
  alpha: Joi.number()
    .description(
      'the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)',
    )
    .min(0)
    .max(1.0)
    .default(0.05),
});

export interface PercentileAggregatorOptions extends SlidingWindowOptions {
  /**
   * the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)
   */
  alpha?: number;
}

export class P75Aggregator extends QuantileAggregator {
  constructor(options: PercentileAggregatorOptions) {
    super({
      quantile: 0.75,
      ...options,
    });
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.P75;
  }

  static get description(): string {
    return '75th Percentile';
  }

  static get schema(): ObjectSchema {
    return SpecificPercentileSchema;
  }
}

export class P90Aggregator extends QuantileAggregator {
  constructor(options: PercentileAggregatorOptions) {
    super({
      quantile: 0.9,
      ...options,
    });
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.P90;
  }

  static get description(): string {
    return '90th Percentile';
  }

  static get schema(): ObjectSchema {
    return SpecificPercentileSchema;
  }
}

export class P95Aggregator extends QuantileAggregator {
  constructor(options: PercentileAggregatorOptions) {
    super({
      quantile: 0.95,
      ...options,
    });
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.P95;
  }

  static get description(): string {
    return '95th Percentile';
  }

  static get schema(): ObjectSchema {
    return SpecificPercentileSchema;
  }
}

export class P99Aggregator extends QuantileAggregator {
  constructor(options: PercentileAggregatorOptions) {
    super({
      quantile: 0.99,
      ...options,
    });
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.P99;
  }

  static get description(): string {
    return '99th Percentile';
  }

  static get schema(): ObjectSchema {
    return SpecificPercentileSchema;
  }
}

export class P995Aggregator extends QuantileAggregator {
  constructor(options: PercentileAggregatorOptions) {
    super({
      quantile: 0.995,
      ...options,
    });
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.P995;
  }

  static get description(): string {
    return '99.5th Percentile';
  }

  static get schema(): ObjectSchema {
    return SpecificPercentileSchema;
  }

  getDescription(metric: Metric, short = false): string {
    const type = getMetricTypeName(metric);
    if (short) {
      return `p995(${type})`;
    }
    return `${type} 99.5th percentile`;
  }
}
