import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';
import { BaseMetric } from '../baseMetric';

/*
An aggregator to return a sum
 */
export class SumAggregator extends SlidingTimeWindowAggregator {
  /**
   * Construct a SumAggregator
   */
  constructor(options?: SlidingWindowOptions) {
    super(options);
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = BaseMetric.getTypeName(metric);
    if (short) {
      return `sum(${type})`;
    }
    return `${type} sum`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Sum;
  }

  static get description(): string {
    return 'Sum';
  }

  onTick(): void {
    const values = this.getPreviousSlice();
    this._value = values.reduce((acc, val) => acc - val, this._value ?? 0);
    this._count = values.length;
  }

  protected handleUpdate(value: number): number {
    if (isNaN(this._value)) return value;
    return (this._value = (this._value ?? 0) + value);
  }
}
