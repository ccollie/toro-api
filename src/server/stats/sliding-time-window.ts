import { EventEmitter } from 'events';
import { isFunction } from 'lodash';
import { calculateInterval } from './utils';
import { UnsubscribeFn } from 'emittery';
import { Clock, TimeTicker } from '../lib';
import ms from 'ms';

function getDefaultValue(defaultValue): any {
  return isFunction(defaultValue) ? defaultValue() : defaultValue;
}

export const InfiniteWindow = ms('10 years');
export const InfiniteWindowOptions = {
  duration: InfiniteWindow,
};

export interface TickEventData<T> {
  popped: T;
  current: T;
  ts: number;
}

export class SlidingTimeWindow<T> extends EventEmitter {
  private _ptr: number;
  private _rotated = false;
  private readonly _ticker: TimeTicker;
  private readonly slices: Array<T>;
  protected readonly clock: Clock;
  private readonly _getDefault: () => T;
  public readonly duration: number;
  public readonly interval: number;
  public readonly capacity: number;

  constructor(clock: Clock, duration: number, defaultValue?: T | (() => T)) {
    super();
    const interval = calculateInterval(duration);
    const valueDefault = defaultValue || 0;
    const len = Math.ceil(duration / interval);
    this.interval = interval; // ??
    this._ptr = 0;
    this.capacity = len;

    this.slices = new Array<T>(len);
    this._getDefault = () => getDefaultValue(valueDefault);

    for (let i = 0; i < len; i++) {
      this.slices[i] = getDefaultValue(valueDefault);
    }

    this.duration = duration;
    this.clock = clock;
    this._ticker = new TimeTicker(interval, clock);
  }

  get length(): number {
    return this.slices.length;
  }

  get isFull(): boolean {
    return this.length === this.capacity;
  }

  public get(n: number): T | undefined {
    this.tickIfNeeded();
    const length = this.slices.length;
    if (n >= length || n < -length) return undefined;
    if (n < 0) n += length;
    n = (this._ptr + n) % this.capacity;
    return this.slices[n];
  }

  public set(n: number, val: T): T {
    this.tickIfNeeded();
    const length = this.slices.length;
    if (n >= length || n < -length) {
      return undefined;
    }
    if (n < 0) n += length;
    n = (this._ptr + n) % this.capacity;
    this.slices[n] = val;
    return val;
  }

  get front(): T {
    return this.get(0);
  }

  get current(): T {
    this.tickIfNeeded();
    return this.slices[this._ptr];
  }

  set current(val: T) {
    this.tickIfNeeded();
    this.slices[this._ptr] = val;
  }

  push(val: T): this {
    this.tickIfNeeded();
    this._ptr = (this._ptr + 1) % this.capacity;
    this.slices[this._ptr] = val;
    return this;
  }

  forEach(handler: (data: T, index?: number) => boolean | void): void {
    const len = this.slices.length;
    for (let step = 0; step < len; step++) {
      const value = this.slices[step];
      if (handler(value, step) === false) break;
    }
  }

  [Symbol.iterator]() {
    const list = this.slices;
    let step = 0;
    const len = this.length;

    return {
      next(): { value: T; done: boolean } {
        if (step < len) {
          const value = list[step];
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

  private tick(): void {
    this._ptr = (this._ptr + 1) % this.capacity;
    // Check if have we rotated at least once. this._ptr === 0 at the start, so
    // if we return there after incrementing, it means we've made at least
    // one full turn
    this._rotated = this._rotated || this._ptr === 0;
    const current = this.slices[this._ptr];
    const popped = this._rotated ? current : null;
    const data = {
      popped,
      current,
      ts: this.clock.getTime(),
    };
    this.emit('tick', data);
  }

  onTick(handler: (eventData?: TickEventData<T>) => void): UnsubscribeFn {
    this.on('tick', handler);
    return () => this.off('tick', handler);
  }

  /**
   * See if we need to do a rotation.
   */
  tickIfNeeded(): boolean {
    return !!this._ticker.tickIfNeeded(() => this.tick());
  }
}
