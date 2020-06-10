'use strict';
import { systemClock } from '../../lib/clock';
import { BaseAggregator } from './aggregator';
import { SlidingWindow, SlidingWindowOptions } from '../lib';

const DEFAULT_VALUE = Number.POSITIVE_INFINITY;

export class MinAggregator extends BaseAggregator {
  private readonly slidingWindow: SlidingWindow<number>;
  private _value = DEFAULT_VALUE;
  private _lastSet: number;

  constructor(options: SlidingWindowOptions) {
    super();

    this.slidingWindow = new SlidingWindow(options, DEFAULT_VALUE);
    this._lastSet = systemClock.now();
    this.slidingWindow.onTick((data) => this.onTick(data));
  }

  destroy(): void {
    this.slidingWindow.destroy();
  }

  get value(): number {
    return this._value;
  }

  static get DEFAULT_VALUE(): number {
    return DEFAULT_VALUE;
  }

  static get key(): string {
    return 'min';
  }

  static get description(): string {
    return 'Minimum Value';
  }

  onTick({ popped }): void {
    if (popped) {
      // If the min recorded value is leaving the sliding window,
      // we need to calculate the min of the remaining slices
      if (popped === this.value) {
        this._value = DEFAULT_VALUE;
        this.slidingWindow.forEach((value) => {
          if (value !== popped) {
            this._value = Math.min(this._value, value);
          }
        });
      }
    }

    this.slidingWindow.current = DEFAULT_VALUE;
  }

  update(newVal: number): number {
    if (!this.slidingWindow) {
      return (this._value = Math.min(this._value, newVal));
    }
    const now = systemClock.now();
    const old = this.value;

    // if we have a new value > current minimum, check if its
    // more than duration from the last time it was set.
    // Consider the following: we're recording latencies over a interval of low activity followed
    // by a interval of spiky behaviour. We have to flush the previous minimum
    if (newVal > old) {
      if (now - this._lastSet > this.slidingWindow.duration) {
        this.slidingWindow.current = DEFAULT_VALUE;
        this._value = DEFAULT_VALUE;
      }
    }

    const min = (this.slidingWindow.current = Math.min(
      this.slidingWindow.current,
      newVal,
    ));
    this._value = Math.min(min, this._value);
    if (old !== this._value) {
      this._lastSet = now;
    }

    return this.value;
  }
}
