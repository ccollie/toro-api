import { SlidingWindowOptions } from '../types';
import { ObjectSchema } from 'joi';
import {
  SlidingTimeWindowAggregator,
  TimeWindowOptionSchema,
} from './SlidingTimeWindowAggregator';
import { OnlineNormalEstimator } from '../../stats';

export type StatsFieldName = 'mean' | 'standardDeviation' | 'variance';

export class StatsBasedAggregator extends SlidingTimeWindowAggregator {
  private readonly field: StatsFieldName;
  protected readonly estimator = new OnlineNormalEstimator();

  /**
   * Construct a StatsBasedAggregator
   * @param {Object} options options
   * @param field
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.interval interval for rolling window
   */
  constructor(options: SlidingWindowOptions, field: StatsFieldName) {
    super(options);
    this.field = field;
  }

  get count(): number {
    return this.estimator.count;
  }

  protected onTick(): void {
    // get the slice of values (of size granularity ms) that moved out of
    // the window
    const oldValues = this.getPreviousSlice();
    // remove them from the estimator
    oldValues.forEach((value) => this.estimator.remove(value));
  }

  protected handleUpdate(value: number): number {
    this.estimator.add(value);
    return this.estimator[this.field];
  }

  static get schema(): ObjectSchema {
    return TimeWindowOptionSchema;
  }
}
