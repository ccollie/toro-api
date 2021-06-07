import {
  SlidingTimeWindowAggregator,
  SlidingWindowOptionSchema,
} from './slidingTimeWindowAggregator';
import { Clock } from '../../lib';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { ObjectSchema } from 'joi';

class SumBucket {
  public value: number;
  public count = 0;

  constructor() {
    this.value = 0;
  }

  add(value: number): number {
    this.value += value;
    this.count++;
    return this.value;
  }

  clear(): void {
    this.value = 0;
    this.count = 0;
  }
}

/*
An aggregator to return a sum
 */
export class SumAggregator extends SlidingTimeWindowAggregator<SumBucket> {
  private _count = 0;
  private _current: SumBucket;

  /**
   * Construct a SumAggregator
   */
  constructor(clock: Clock, options?: SlidingWindowOptions) {
    super(clock, () => new SumBucket(), options);
    this._current = this.currentSlice;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Sum;
  }

  static get description(): string {
    return 'Sum';
  }

  get count(): number {
    return this._count;
  }

  get value(): number {
    return this._value;
  }

  protected onTick({ popped, current }): void {
    if (popped) {
      this._value = Math.max(this._value - popped.value, 0);
      this._count -= popped.count;
      popped.clear();
    }
    this._current = current;
  }

  protected handleUpdate(newVal: number): number {
    this._value += newVal;
    this._count++;
    this.currentSlice.add(newVal);
    return this._value;
  }

  static get schema(): ObjectSchema {
    return SlidingWindowOptionSchema;
  }
}
