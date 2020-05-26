'use strict';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { EventEmitter } from 'events';
import { systemClock } from '../../lib/clock';

const DEFAULT_VALUE = Number.NEGATIVE_INFINITY;

class Bucket {
  public value: number;

  constructor() {
    this.value = DEFAULT_VALUE;
  }

  add(value) {
    this.value = Math.max(this.value, value);
    return this.value;
  }

  clear() {
    this.value = DEFAULT_VALUE;
  }
}

export class SlidingWindowMaximum extends EventEmitter {
  private slidingWindow: SlidingWindow<Bucket>;
  private _lastSet?: number;
  value: number;

  constructor(options?: SlidingWindowOptions) {
    super();

    this.slidingWindow = new SlidingWindow(options, () => new Bucket());
    this.value = DEFAULT_VALUE;
    this._lastSet = undefined;
    this.slidingWindow.on('tick', (data) => this.onTick(data));
  }

  destroy() {
    this.slidingWindow.destroy();
  }

  get duration(): number {
    return this.slidingWindow.duration;
  }

  get period(): number {
    return this.slidingWindow.period;
  }

  get currentValue() {
    return this.currentWindow.value;
  }

  get currentWindow() {
    return this.slidingWindow.current;
  }

  static get DEFAULT_VALUE() {
    return DEFAULT_VALUE;
  }

  onTick(data) {
    const { popped, current } = data;
    if (popped) {
      const val = popped.value;
      popped.clear();

      // If the max recorded value is leaving the sliding window,
      // we need to calculate the max of the remaining slices
      if (val === this.value) {
        this.value = DEFAULT_VALUE;
        this.slidingWindow.forEach((data) => {
          if (data && data.value !== val) {
            this.value = Math.max(data.value, this.value);
          }
        });
      }
    }
    if (current) {
      current.clear();
    }
  }

  update(newVal) {
    const now = systemClock.now();
    const old = this.value;

    // if we have a new value < current max, check if its more than duration from
    // the last time it was set. Consider the following: we're recording latencies
    // over a period of high activity followed by a period of low behaviour. We have
    // to flush the previous maximum
    if (newVal < this.value) {
      if (now - this._lastSet > this.duration) {
        this.currentWindow.clear();
        this.value = newVal;
      }
    }

    this.value = Math.max(this.currentValue, this.value);
    if (old !== this.value) {
      this._lastSet = now;
    }

    return this.value;
  }
}

module.exports = SlidingWindowMaximum;
