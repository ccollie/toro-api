'use strict';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';

export class MinAggregator extends SlidingTimeWindowAggregator {
  constructor(options?: SlidingWindowOptions) {
    super(options);
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = BaseMetric.getTypeName(metric);
    if (short) {
      return `min(${type})`;
    }
    return `${type} min`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Min;
  }

  static get description(): string {
    return 'Minimum';
  }

  onTick(): void {
    const values = this.getCurrentValues();
    this._value = Math.min(...values);
    this._count = values.length;
  }

  protected handleUpdate(value: number): number {
    if (isNaN(this._value)) return value;
    return Math.min(value, this._value ?? value);
  }
}
