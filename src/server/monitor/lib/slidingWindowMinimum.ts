'use strict';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { systemClock } from '../../lib/clock';
import { EventEmitter } from 'events';

const DEFAULT_VALUE = Number.POSITIVE_INFINITY;

export class SlidingWindowMinimum extends EventEmitter {
  private readonly slidingWindow: SlidingWindow<number>;
  public value: number;
  private _lastSet: number;

  constructor(options: SlidingWindowOptions) {
    super();

    this.slidingWindow = new SlidingWindow(options, DEFAULT_VALUE);

    this.value = DEFAULT_VALUE;
    this._lastSet = systemClock.now();
    this.slidingWindow.onTick((data) => this.onTick(data));
  }

  destroy() {
    this.slidingWindow.destroy();
  }

  get duration(): number {
    return this.slidingWindow.duration;
  }

  get period() {
    return this.slidingWindow.period;
  }

  static get DEFAULT_VALUE() {
    return DEFAULT_VALUE;
  }

  onTick({ popped }) {
    if (popped) {
      // If the min recorded value is leaving the sliding window,
      // we need to calculate the min of the remaining slices
      if (popped === this.value) {
        this.value = DEFAULT_VALUE;
        this.slidingWindow.forEach((value) => {
          if (value !== popped) {
            this.value = Math.min(this.value, value);
          }
        });
      }
    }

    this.slidingWindow.current = DEFAULT_VALUE;
  }

  update(newVal: number) {
    const now = systemClock.now();
    const old = this.value;

    // if we have a new value > current minimum, check if its
    // more than duration from the last time it was set.
    // Consider the following: we're recording latencies over a period of low activity followed
    // by a period of spiky behaviour. We have to flush the previous minimum
    if (newVal > this.value) {
      if (now - this._lastSet > this.duration) {
        this.slidingWindow.current = DEFAULT_VALUE;
        this.value = DEFAULT_VALUE;
      }
    }

    const min = (this.slidingWindow.current = Math.min(
      this.slidingWindow.current,
      newVal,
    ));
    this.value = Math.min(min, this.value);
    if (old !== this.value) {
      this._lastSet = now;
    }

    return this.value;
  }
}
