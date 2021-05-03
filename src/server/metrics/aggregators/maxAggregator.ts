import {
  SlidingTimeWindowAggregator,
  SlidingWindowOptionSchema,
} from './slidingTimeWindowAggregator';
import { Clock, getStaticProp } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '../../../types';
import { TickEventData } from '../../stats';
import { ObjectSchema } from 'joi';

const DEFAULT_VALUE = Number.NEGATIVE_INFINITY;

class Bucket {
  public value: number;
  public count = 0;

  constructor() {
    this.value = DEFAULT_VALUE;
  }

  update(value: number): number {
    this.value = Math.max(this.value, value);
    this.count++;
    return this.value;
  }

  clear(): void {
    this.value = DEFAULT_VALUE;
    this.count = 0;
  }
}

export class MaxAggregator extends SlidingTimeWindowAggregator<Bucket> {
  private _count = 0;
  private _current: Bucket;
  /**
   * Construct a MaxAggregator
   * @param clock
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.interval interval for rolling window
   */
  constructor(clock: Clock, options?: SlidingWindowOptions) {
    super(clock, () => new Bucket(), options);
    this._value = DEFAULT_VALUE;
    this._current = this.currentSlice;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Max;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return `max(${type})`;
    }
    return `${type} max`;
  }

  static get description(): string {
    return 'Maximum';
  }

  get currentValue(): number {
    return this.currentSlice?.value || this._value;
  }

  get count(): number {
    return this._count;
  }

  onTick(data: TickEventData<Bucket>): void {
    const { popped, current } = data;
    if (popped) {
      const val = popped.value;

      // If the max recorded value is leaving the sliding window,
      // we need to calculate the max of the remaining slices
      if (val === this._value) {
        this._value = DEFAULT_VALUE;
        this.slidingWindow.forEach((data) => {
          if (data.value !== val) {
            this._value = Math.max(data.value, this._value);
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
    this._value = Math.max(this._current.update(newVal), this._value);
    return this._value;
  }

  static get schema(): ObjectSchema {
    return SlidingWindowOptionSchema;
  }
}
