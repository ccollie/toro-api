import { EventEmitter } from 'events';
import { isFunction } from 'lodash';
import { calculateInterval } from './utils';
import { UnsubscribeFn } from 'emittery';
import { ChunkedAssociativeArray, Clock, TimeTicker } from '../lib';
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

const TRIM_THRESHOLD = 15;

export class SlidingTimeWindow<T> extends EventEmitter {
  private _ptr: number;
  private _rotated = false;
  private lastWrite: number;
  private tickCount = 0;
  protected lastTick: number;
  protected prevWindowStart: number;
  private readonly _ticker: TimeTicker;
  private readonly slices: Array<T>;
  private readonly data: ChunkedAssociativeArray<number, T>;
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

    this.data = new ChunkedAssociativeArray<number, T>();
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

  private align(ts: number): number {
    return ts - (ts % this.interval);
  }

  protected getPreviousValues(): T[] {
    const start = this.prevWindowStart;
    const end = this.lastTick - 1;
    return this.data.getValues(start, end);
  }

  protected getCurrentValues(): T[] {
    return this.data.getValues(this.lastTick);
  }

  getValues(start?: number, end?: number): T[] {
    return this.data.getValues(start, end);
  }

  _tickIfNeeded(now: number): boolean {
    if (!this.lastTick) {
      this.lastTick = this.align(now);
      this.prevWindowStart = this.lastTick - this.interval;
      return false;
    }
    const granularity = this.interval;
    if (now - this.lastTick >= granularity) {
      this.prevWindowStart = this.lastTick;
      this.lastTick = this.align(now);
      // this.onTick();
      if (++this.tickCount % TRIM_THRESHOLD === 0) {
        this.tickCount = 0;
        this.data.trim(this.prevWindowStart);
        // this._count = this.data.size();
      }
      return true;
    }
    return false;
  }

  public get(n: number): T | undefined {
    this.tickIfNeeded();
    const length = this.slices.length;
    if (n >= length || n < -length) return undefined;
    if (n < 0) n += length;
    n = (this._ptr + n) % this.capacity;
    return this.slices[n];
  }

  get current(): T {
    this.tickIfNeeded();
    return this.slices[this._ptr];
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
