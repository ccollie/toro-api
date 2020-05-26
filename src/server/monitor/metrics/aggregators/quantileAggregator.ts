import Joi from '@hapi/joi';
import { SlidingWindowQuantile, SlidingWindowOptions } from '../../lib';
import { SlidingWindowAggregator } from './aggregator';

import baseSchema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';

const schema = baseSchema.keys({
  alpha: Joi.number()
    .description(
      'the relative accuracy guarantee as a fractional percentage (0.0 - 1.0)',
    )
    .positive()
    .min(0)
    .max(1.0)
    .default(0.05),
  quantile: Joi.number()
    .description('the quantile as a fraction, e.g. 0.5 for the mean')
    .positive()
    .min(0)
    .max(1.0),
});

export class QuantileAggregator extends SlidingWindowAggregator {
  private readonly _data: SlidingWindowQuantile;
  private readonly _q: number;
  /**
   * Construct a QuantileAggregator
   * @param {SlidingWindowOptions} window rolling statistical window for the stats functions
   * @param {Number} alpha
   * @param {Number} quantile the desired quantile (0.0 - 1)
   * @param window
   */
  constructor(window: SlidingWindowOptions, quantile: number, alpha = 0.005) {
    super();
    this._q = quantile || 0.95;
    this._data = new SlidingWindowQuantile(window, alpha);
  }

  destroy(): void {
    this._data.destroy();
    super.destroy();
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  static get key(): string {
    return 'quantile';
  }

  static get description(): string {
    return 'Quantile Value';
  }

  get value(): number {
    return this._data.quantile(this._q);
  }

  get duration(): number {
    return this._data.duration;
  }

  get period(): number {
    return this._data.period;
  }

  update(value) {
    return this._data.update(value);
  }

  onTick(handler) {
    return this._data.onTick(handler);
  }
}
