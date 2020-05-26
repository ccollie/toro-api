import Joi from '@hapi/joi';
import { SlidingWindowAggregator } from './aggregator';
import {
  StreamingZScore,
  StreamingZScoreOptions,
  SlidingWindowOptions,
} from '../../lib';
import baseSchema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';

const schema = baseSchema.keys({
  threshold: Joi.number().description('std deviations').positive().default(3.5),
  influence: Joi.number().positive().default(0.5),
  lag: Joi.number().integer().positive().default(10),
});

/**
 * A ZScoreAggregator does streaming ZScore smoothing
 */
export class ZScoreAggregator extends SlidingWindowAggregator {
  private readonly zscore: StreamingZScore;
  /***
   * Construct a ZScoreAggregator
   * @param window
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the smoothing functions
   * @param {Number} options.period period for rolling window
   * @param {Number} options.threshold standard deviations for signal
   * @param {Number} options.influence between 0 and 1, where 1 is normal influence, 0.5 is half
   * @param {Number} options.lag minimum number of samples
   * @returns ZScoreAggregator
   */
  constructor(window: SlidingWindowOptions, options: StreamingZScoreOptions) {
    super();
    this.zscore = new StreamingZScore(window, options);
  }

  destroy(): void {
    this.zscore.destroy();
    super.destroy();
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  static get key(): string {
    return 'zscore';
  }

  static get description(): string {
    return 'Smoothed ZScore Aggregator';
  }

  get value(): number {
    return this.zscore.value;
  }

  get signal(): number {
    return this.zscore.signal;
  }

  get duration(): number {
    return this.zscore.duration;
  }

  get period(): number {
    return this.zscore.period;
  }

  update(value) {
    return this.zscore.update(value);
  }

  onTick(handler) {
    this.zscore.onTick(handler);
    // return () => this._windows.off('tick', handler);
  }
}
