import { EventEmitter } from 'events';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { systemClock } from '../../lib/clock';

class Bucket {
  private values: Record<string, number> = {};
  public startedAt: number;

  constructor() {
    this.values = {};
    this.startedAt = systemClock.now();
  }

  clear(): void {
    this._reset();
  }

  incr(key: string, delta: number): number {
    return (this.values[key] = (this.values[key] || 0) + (delta || 1));
  }

  get(key: string): number {
    return this.values[key] || 0;
  }

  set(key: string, value: number): number {
    return (this.values[key] = value || 0);
  }

  assign(other: Bucket): void {
    this.values = {};
    Object.keys(other.values).forEach((key) => {
      this.values[key] = other[key] || 0;
    });
  }

  subtract(other: Bucket): void {
    Object.keys(this.values).forEach((key) => {
      this.values[key] = (this.values[key] || 0) - (other[key] || 0);
    });
  }

  _reset(): void {
    Object.keys(this.values).forEach((key) => {
      this.values[key] = 0;
    });
  }
}

/**
 * A sliding window counter for data from a stream.
 */
export class SlidingWindowCounter extends EventEmitter {
  private readonly _windows: SlidingWindow<Bucket>;
  private _currentWindow: Bucket;
  private _accumulator: Bucket;

  constructor(options: SlidingWindowOptions) {
    super();
    const { duration, period } = options;

    this._windows = new SlidingWindow<Bucket>(
      {
        duration,
        period,
      },
      () => new Bucket(),
    );

    this._currentWindow = this._windows.current;
    this._accumulator = new Bucket();
    this._windows.on('tick', (data) => this.handleTick(data));
  }

  destroy(): void {
    this._windows.destroy();
  }

  reset(): void {
    this._accumulator._reset();
    this._windows.forEach((bucket) => bucket.clear());
  }

  onTick(handler) {
    this._windows.on('tick', handler);
  }

  handleTick({ popped, current, ts }): void {
    if (popped) {
      this._accumulator.subtract(popped);
      popped.clear();
    }
    if (current) {
      this._currentWindow = current;
      this._currentWindow.startedAt = ts;
      current.clear();
    }
  }

  get duration(): number {
    return this._windows.duration;
  }

  get period(): number {
    return this._windows.period;
  }

  get(key: string): number {
    return this._accumulator.get(key);
  }

  incr(key: string, delta = 1): number {
    this._currentWindow.incr(key, delta);
    return this._accumulator.incr(key, delta);
  }

  set(key: string, value: number): number {
    this._currentWindow.set(key, value);
    return this._accumulator.set(key, value);
  }

  get current(): Bucket {
    return this._windows.current;
  }

  get timeSpan(): number {
    return this._windows.timeSpan;
  }
}
