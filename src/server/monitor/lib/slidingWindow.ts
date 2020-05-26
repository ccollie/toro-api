import { EventEmitter } from 'events';
import { Deque } from './deque';
import { isFunction } from 'lodash';
import { systemClock } from '../../lib/clock';
import { parseDuration } from '../../lib/datetime';
import { accurateInterval } from '../../lib/timers';
import { calculateWindowSize, getSlidingWindowDefaults } from './utils';

function getDefaultValue(defaultValue): any {
  return isFunction(defaultValue) ? defaultValue() : defaultValue;
}

export interface SlidingWindowOptions {
  duration: number;
  period?: number;
}

export class SlidingWindow<T> extends EventEmitter {
  private _ptr: number;
  private readonly _windows: any;
  private readonly _len: number;
  public duration: number;
  private _windowStart: number;
  private readonly _start: number;
  public readonly period: number;
  private _timer: any;

  constructor(options: SlidingWindowOptions, defaultValue?: T | (() => T)) {
    super();
    const defaults = getSlidingWindowDefaults();
    const duration = parseDuration(options.duration || defaults.duration);
    const period = parseDuration(
      options.period || calculateWindowSize(duration),
    );
    const valueDefault = defaultValue || 0;
    const len = Math.ceil(duration / period);
    this.period = period; // ??
    this._ptr = 0;
    this._len = len;

    this._windows = new Deque(len);
    for (let i = 0; i < len; i++) {
      const val = getDefaultValue(valueDefault);
      this._windows.push(val);
    }

    this.duration = duration;
    this._windowStart = this._start = systemClock.now();
    this._timer = accurateInterval(() => this.spin(), this.period);
  }

  destroy(): void {
    this._timer.clear();
  }

  get capacity(): number {
    return this._len;
  }

  get length(): number {
    return this._windows.length;
  }

  get isFull(): boolean {
    return this.length === this.capacity;
  }

  get current(): T {
    return this._windows.get(this._ptr);
  }

  set current(val: T) {
    this._windows.set(this._ptr, val);
  }

  get index(): number {
    return this._ptr;
  }

  get top(): T {
    return this._windows.get(this._ptr - this._len);
  }

  push(item: T): void {
    this._windows.push(item);
  }

  get(index: number): T {
    return this._windows.get(index);
  }

  forEach(handler): void {
    const list = this._windows;
    const ptr = this._ptr;

    for (let i = 0; i < this._len; i++) {
      const value = list.get(ptr - i);
      if (handler(value) === false) break;
    }
  }

  [Symbol.iterator]() {
    let step = 0;
    const list = this._windows;
    const ptr = this._ptr;
    const len = this._len;

    return {
      next() {
        if (step < len) {
          const value = list.get(ptr - step);
          step++;
          return {
            value,
            done: false,
          };
        } else {
          return {
            value: undefined,
            done: true,
          };
        }
      },
    };
  }

  spin() {
    const popped = this.top;
    this._ptr = (this._ptr + 1) % this.capacity;
    const current = this.current;
    this._windowStart = systemClock.now();
    const data = {
      start: this._windowStart - this.duration,
      popped,
      current,
    };
    this.emit('tick', data);
  }

  // Helper property
  get timeSpan(): number {
    return Math.min(this._windowStart - this._start, this.duration);
  }

  onTick(handler) {
    this.on('tick', handler);
    return () => this.off('tick', handler);
  }
}
