import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';

export class MaxAggregator extends SlidingTimeWindowAggregator {
  /**
   * Construct a MaxAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.interval interval for rolling window
   */
  constructor(options?: SlidingWindowOptions) {
    super(options);
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Max;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = BaseMetric.getTypeName(metric);
    if (short) {
      return `max(${type})`;
    }
    return `${type} max`;
  }

  static get description(): string {
    return 'Maximum';
  }

  protected onTick(): void {
    const values = this.getCurrentValues();
    this._value = Math.max(...values);
    this._count = values.length;
  }

  protected handleUpdate(value: number): number {
    if (isNaN(this._value)) return value;
    return Math.max(value, this._value ?? value);
  }
}
