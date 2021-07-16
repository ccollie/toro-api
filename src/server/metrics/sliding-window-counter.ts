import { EventEmitter } from 'events';
import { SlidingTimeWindow } from '../stats';
import { Clock } from '../lib';

class Bucket {
  private values: Record<string, number> = Object.create(null);

  constructor() {
    this.values = Object.create(null);
  }

  clear(): void {
    this._reset();
  }

  incr(key: string, delta: number): number {
    return (this.values[key] = (this.values[key] || 0) + (delta ?? 1));
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
      this.values[key] = (this.values[key] ?? 0) - (other[key] ?? 0);
    });
  }

  _reset(): void {
    Object.keys(this.values).forEach((key) => {
      this.values[key] = 0;
    });
  }
}

export interface CounterInterface {
  reset(): void;
  get(key: string): number;
  incr(key: string, delta?: number): number;
  set(key: string, value: number): number;
}

/**
 * A sliding window counter for data from a stream.
 */
export class SlidingWindowCounter
  extends EventEmitter
  implements CounterInterface
{
  private readonly _windows: SlidingTimeWindow<Bucket>;
  private _currentWindow: Bucket;
  private _accumulator: Bucket;

  constructor(clock: Clock, duration: number) {
    super();

    this._windows = new SlidingTimeWindow<Bucket>(
      clock,
      duration,
      () => new Bucket(),
    );

    this._currentWindow = this._windows.current;
    this._accumulator = new Bucket();
    this._windows.on('tick', (data) => this.handleTick(data));
  }

  reset(): void {
    this._accumulator._reset();
    this._windows.forEach((bucket) => bucket.clear());
  }

  onTick(handler: (eventData?: unknown) => void): void {
    this._windows.on('tick', handler);
  }

  handleTick({ popped, current }): void {
    if (popped) {
      this._accumulator.subtract(popped);
      popped.clear();
    }
    this._currentWindow = current;
  }

  get duration(): number {
    return this._windows.duration;
  }

  get interval(): number {
    return this._windows.interval;
  }

  get(key: string): number {
    this._windows.tickIfNeeded();
    return this._accumulator.get(key);
  }

  incr(key: string, delta = 1): number {
    this._windows.tickIfNeeded();
    this._currentWindow.incr(key, delta);
    return this._accumulator.incr(key, delta);
  }

  set(key: string, value: number): number {
    this._windows.tickIfNeeded();
    this._currentWindow.set(key, value);
    return this._accumulator.set(key, value);
  }

  get current(): Bucket {
    return this._windows.current;
  }
}
