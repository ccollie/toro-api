import { SlidingWindow, SlidingWindowOptions } from '../lib';
import { BaseAggregator } from './aggregator';
import { systemClock } from '../../lib/clock';

const DEFAULT_VALUE = Number.NEGATIVE_INFINITY;

class Bucket {
  public value: number;

  constructor() {
    this.value = DEFAULT_VALUE;
  }

  add(value: number): number {
    this.value = Math.max(this.value, value);
    return this.value;
  }

  clear(): void {
    this.value = DEFAULT_VALUE;
  }
}

export class MaxAggregator extends BaseAggregator {
  private readonly slidingWindow: SlidingWindow<Bucket>;
  private _lastSet?: number;
  private _value = DEFAULT_VALUE;
  private _currentWindow: Bucket;

  /**
   * Construct a MaxAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.period period for rolling window
   */
  constructor(options: SlidingWindowOptions) {
    super();
    this.slidingWindow = new SlidingWindow(options, () => new Bucket());
    this._lastSet = undefined;
    this.slidingWindow.on('tick', (data) => this.onTick(data));
  }

  destroy(): void {
    if (this.slidingWindow) {
      this.slidingWindow.destroy();
    }
    super.destroy();
  }

  static get key(): string {
    return 'max';
  }

  static get description(): string {
    return 'Maximum Value';
  }

  get value(): number {
    return this._value;
  }

  get currentValue(): number {
    return this.currentWindow?.value || this._value;
  }

  private get currentWindow(): Bucket {
    return this._currentWindow;
  }

  onTick(data): void {
    const { popped, current } = data;
    if (popped) {
      const val = popped.value;
      popped.clear();

      // If the max recorded value is leaving the sliding window,
      // we need to calculate the max of the remaining slices
      if (val === this._value) {
        this._value = DEFAULT_VALUE;
        this.slidingWindow.forEach((data) => {
          if (data && data.value !== val) {
            this._value = Math.max(data.value, this._value);
          }
        });
      }
    }
    if (current) {
      current.clear();
    }
  }

  update(newVal: number): number {
    if (!this.slidingWindow) {
      return (this._value = Math.min(this._value, newVal));
    }

    const now = systemClock.now();
    const old = this._value;

    // if we have a new value < current max, check if its more than duration from
    // the last time it was set. Consider the following: we're recording latencies
    // over a period of high activity followed by a period of low behaviour. We have
    // to flush the previous maximum
    if (newVal < old) {
      if (now - this._lastSet > this.slidingWindow.duration) {
        this.currentWindow.clear();
        this._value = newVal;
      }
    }

    this._value = Math.max(this.currentValue, this.value);
    if (old !== this._value) {
      this._lastSet = now;
    }

    return this._value;
  }
}

module.exports = MaxAggregator;
