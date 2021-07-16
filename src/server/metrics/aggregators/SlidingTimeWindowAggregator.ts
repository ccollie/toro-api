import { calculateInterval } from '../../stats';
import { ChunkedAssociativeArray, systemClock } from '../../lib';
import { BaseAggregator, WindowedAggregator } from './aggregator';
import { SlidingWindowOptions } from '@src/types';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../../validation/schemas';
import ms from 'ms';

export const TimeWindowOptionSchema = Joi.object().keys({
  windowSize: DurationSchema.required(),
  granularity: DurationSchema.required(),
});

const TRIM_THRESHOLD = 5;
const FIFTEEN_MINUTES = ms('15 min');

// TODO: establish bounds on the window duration or we could have an infinitely growing set of data
export class SlidingTimeWindowAggregator
  extends BaseAggregator
  implements WindowedAggregator
{
  private tickCount = 0;
  private _firstTick: number;
  private _lastTick: number;
  private _lastTimestamp: number | undefined;
  private _isFullWindow: boolean;
  protected _value: number | undefined;
  protected _count = 0;
  protected readonly data = new ChunkedAssociativeArray<number, number>();

  constructor(options: SlidingWindowOptions = { duration: FIFTEEN_MINUTES }) {
    super({
      duration: FIFTEEN_MINUTES,
      granularity: calculateInterval(options?.duration ?? FIFTEEN_MINUTES),
      ...options,
    });
  }

  get value(): number {
    return this._value;
  }

  get count(): number {
    return this._count;
  }

  get granularity(): number {
    return this.options.granularity;
  }

  get windowSize(): number {
    return this.options.duration;
  }

  get isFullWindow(): boolean {
    if (!this._isFullWindow) {
      const first = this._firstTick ?? 0;
      const last = this._lastTimestamp ?? this.lastTimestamp ?? 0;
      this._isFullWindow = last - first >= this.windowSize;
    }
    return this._isFullWindow;
  }

  get lastTick(): number {
    return this._lastTick;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  protected onTick(): void {}

  protected handleUpdate(value: number, ts?: number): number {
    return value;
  }

  private align(ts: number): number {
    return ts - (ts % this.granularity);
  }

  protected get lastTimestamp(): number {
    return this._lastTimestamp ?? this.data.lastKey ?? 0;
  }

  get currentWindowStart(): number {
    const start = Math.max(this.lastTimestamp - this.windowSize, 0);
    return this.align(start);
  }

  protected getPreviousValues(): number[] {
    const start = this.currentWindowStart - this.granularity;
    const end = start + this.windowSize - 1;
    return start > 0 ? this.data.getValues(start, end) : [];
  }

  protected getPreviousSlice(): number[] {
    const currentStart = this.currentWindowStart;
    const start = Math.max(0, currentStart - this.granularity);
    const end = currentStart - 1;
    return start > 0 ? this.data.getValues(start, end) : [];
  }

  getCurrentValues(): number[] {
    return this.data.getValues(this.currentWindowStart);
  }

  protected trim(): void {
    const deleteBefore = this.currentWindowStart - this.granularity;
    if (deleteBefore > 0) {
      this.data.trim(deleteBefore);
      // this._count = this.data.size();
    }
  }

  tickIfNeeded(now: number): boolean {
    if (!this._lastTick) {
      this._firstTick = now;
      this._lastTick = this.align(now);
      return false;
    }
    if (now - this._lastTick >= this.granularity) {
      // tick only if we have a full window
      if (now - this._firstTick > this.windowSize) {
        this._lastTimestamp = now;
        this.onTick();
        if (++this.tickCount % TRIM_THRESHOLD === 0) {
          this.tickCount = 0;
          this.trim();
        }
        this._lastTick = this.align(now);
        this._lastTimestamp = undefined;
        return true;
      }
    }
    return false;
  }

  // to override
  update(value: number, ts?: number): number {
    const now = ts ?? systemClock.getTime();
    this.tickIfNeeded(now);
    this.data.put(now, value);
    this._count++;
    this._value = this.handleUpdate(value, now);
    return this._value;
  }

  static get isWindowed(): boolean {
    return true;
  }

  static get schema(): ObjectSchema {
    return TimeWindowOptionSchema;
  }
}
