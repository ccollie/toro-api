import Joi, { ObjectSchema } from 'joi';
import { Clock, getStaticProp, ordinal } from '../../lib';
import { QuantileEstimator, TickEventData } from '../../stats';
import baseSchema from '../slidingWindowBaseSchema';
import { SlidingTimeWindowAggregator } from './slidingTimeWindowAggregator';
import { BaseMetric } from '../baseMetric';
import {
  AggregatorTypes,
  SerializedAggregator,
  SlidingWindowOptions,
} from '../../../types';
import { round } from 'lodash';

function quantileToString(q: number): string {
  return 'p' + (q * 100).toString(10).replace('.', '');
}

export interface QuantileAggregatorOptions extends SlidingWindowOptions {
  /**
   * the quantile as a fraction, e.g. 0.5 for the mean
   */
  quantile: number;
  /**
   * the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)
   */
  alpha?: number;
}

function makeEstimator(options?: QuantileAggregatorOptions): QuantileEstimator {
  return new QuantileEstimator(options.alpha);
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
export class QuantileAggregator extends SlidingTimeWindowAggregator<QuantileEstimator> {
  private readonly accumulator: QuantileEstimator;
  private current: QuantileEstimator;

  /**
   * Construct a SlidingWindowQuantileAggregator
   * @param clock
   * @param options
   * @param {Number} options.alpha
   * @param {Number} options.quantile the desired quantile (0.0 - 1)
   */
  constructor(clock: Clock, options?: QuantileAggregatorOptions) {
    super(clock, () => makeEstimator(options), options);
    this.accumulator = makeEstimator(options);
    this.current = this.currentSlice;
  }

  static get schema(): ObjectSchema {
    return QuantileAggregatorSchema;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    const q = round(this.quantile, 2);
    if (short) {
      const str = quantileToString(q);
      return `${str}(${type})`;
    }
    return `${type} ${ordinal(q)} percentile`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Quantile;
  }

  static get description(): string {
    return 'Quantile Value';
  }

  get quantile(): number {
    return (this.options as QuantileAggregatorOptions).quantile;
  }

  get alpha(): number {
    return (this.options as QuantileAggregatorOptions).alpha;
  }

  protected onTick(data: TickEventData<QuantileEstimator>): void {
    const { popped, current } = data;
    if (popped) {
      this.accumulator.subtract(popped);
      popped.clear();
    }
    this.current = current;
  }

  protected handleUpdate(newVal: number): number {
    this.current.update(newVal);
    this.accumulator.update(newVal);
    return this.accumulator.quantile(this.quantile);
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
  constructor(clock: Clock, options: PercentileAggregatorOptions) {
    super(clock, {
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
  constructor(clock: Clock, options: PercentileAggregatorOptions) {
    super(clock, {
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
  constructor(clock: Clock, options: PercentileAggregatorOptions) {
    super(clock, {
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
  constructor(clock: Clock, options: PercentileAggregatorOptions) {
    super(clock, {
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
  constructor(clock: Clock, options: PercentileAggregatorOptions) {
    super(clock, {
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
}
