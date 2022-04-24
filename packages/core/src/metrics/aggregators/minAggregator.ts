'use strict';
import { AggregatorTypes, SlidingWindowOptions } from '../../types';
import { SlidingTimeWindowAggregator } from './SlidingTimeWindowAggregator';
import { Metric } from '../metric';

export class MinAggregator extends SlidingTimeWindowAggregator {
  constructor(options?: SlidingWindowOptions) {
    super(options);
  }

  getDescription(metric: Metric, short = false): string {
    const type = metric.name.name;
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
