import { InfiniteWindow, SlidingTimeWindow, TickEventData } from '../../stats';
import { Clock } from '../../lib';
import { BaseAggregator, WindowedAggregator } from './aggregator';
import { SlidingWindowOptions } from '@src/types';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../../validation/schemas';

export const SlidingWindowOptionSchema = Joi.object().keys({
  windowSize: DurationSchema.required(),
});

export class SlidingTimeWindowAggregator<TSlice = number>
  extends BaseAggregator
  implements WindowedAggregator
{
  protected readonly options: SlidingWindowOptions;
  protected readonly slidingWindow: SlidingTimeWindow<TSlice>;
  protected _value: number | undefined;

  constructor(
    clock: Clock,
    defaultValue: TSlice | (() => TSlice),
    options: SlidingWindowOptions = { duration: InfiniteWindow },
  ) {
    super(clock);
    this.options = options;
    this.slidingWindow = new SlidingTimeWindow<TSlice>(
      clock,
      options.duration,
      defaultValue,
    );
    this.slidingWindow.onTick((data) => {
      this.onTick(data);
    });
  }

  get value(): number {
    this.slidingWindow.tickIfNeeded();
    return this._value;
  }

  get interval(): number {
    return this.slidingWindow.interval;
  }

  get windowSize(): number {
    return this.slidingWindow.duration;
  }

  get sliceCount(): number {
    return this.slidingWindow.length;
  }

  protected getTime(): number {
    return this.clock.getTime();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/no-empty-function
  protected onTick(data?: TickEventData<TSlice>): void {}

  get currentSlice(): TSlice {
    return this.slidingWindow.current;
  }

  protected handleUpdate(value: number): number {
    return value;
  }

  // to override
  update(value: number): number {
    this.slidingWindow.tickIfNeeded();
    return this.handleUpdate(value);
  }

  static get isWindowed(): boolean {
    return true;
  }

  static get schema(): ObjectSchema {
    return SlidingWindowOptionSchema;
  }
}
