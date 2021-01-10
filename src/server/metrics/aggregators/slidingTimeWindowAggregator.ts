import { InfiniteWindow, SlidingTimeWindow, TickEventData } from '../../stats';
import { Clock } from '../../lib';
import { BaseAggregator } from './aggregator';
import { SlidingWindowOptions } from '../../../types';

export class SlidingTimeWindowAggregator<
  TSlice = number
> extends BaseAggregator {
  protected readonly slidingWindow: SlidingTimeWindow<TSlice>;
  protected _value: number | undefined;
  protected readonly options: SlidingWindowOptions;
  protected clock: Clock;

  constructor(
    clock: Clock,
    defaultValue: TSlice | (() => TSlice),
    options: SlidingWindowOptions = { duration: InfiniteWindow },
  ) {
    super();
    this.clock = clock;
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

  get duration(): number {
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

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    return {
      type,
      options: { ...this.options },
    };
  }
}
