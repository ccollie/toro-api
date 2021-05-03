'use strict';
import { Clock, getStaticProp } from '../../lib';
import {
  SlidingTimeWindowAggregator,
  SlidingWindowOptionSchema,
} from './slidingTimeWindowAggregator';
import { TickEventData } from '../../stats';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '../../../types';
import { ObjectSchema } from 'joi';

const DEFAULT_VALUE = Number.POSITIVE_INFINITY;

class MinBucket {
  public value: number;
  public count = 0;

  constructor() {
    this.value = DEFAULT_VALUE;
  }

  update(value: number): number {
    this.value = Math.min(this.value, value);
    this.count++;
    return this.value;
  }

  clear(): void {
    this.value = DEFAULT_VALUE;
    this.count = 0;
  }
}

export class MinAggregator extends SlidingTimeWindowAggregator<MinBucket> {
  private _count = 0;
  private _current: MinBucket;

  constructor(clock: Clock, options?: SlidingWindowOptions) {
    super(clock, () => new MinBucket(), options);
    this._current = this.currentSlice;
  }

  get count(): number {
    return this._count;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
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

  onTick(data: TickEventData<MinBucket>): void {
    const { popped, current } = data;
    if (popped) {
      // If the min recorded value is leaving the sliding window,
      // we need to calculate the min of the remaining slices
      if (popped.value === this.value) {
        this._value = DEFAULT_VALUE;
        this.slidingWindow.forEach((bucket: MinBucket) => {
          if (bucket.value !== popped.value) {
            this._value = Math.min(this._value, bucket.value);
          }
        });
      }
      this._count -= popped.count;
      popped.clear();
    }
    this._current = current;
  }

  protected handleUpdate(newVal: number): number {
    this._count++;
    this._value = Math.min(this._current.update(newVal), this._value);
    return this._value;
  }

  static get schema(): ObjectSchema {
    return SlidingWindowOptionSchema;
  }
}
