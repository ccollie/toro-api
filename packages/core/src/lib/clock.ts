// A clock that gets its value from a stream id if its less than
// the current time or the current time otherwise

import { isDate } from 'lodash';

export interface Clock {
  //set(val);
  clear(): void;
  getTime(): number;
}

function normalize(val: unknown): number {
  let value;
  if (typeof val === 'string') {
    val = val.split('-')[0];
    value = parseInt(val as string, 10);
  } else if (isDate(val)) {
    value = val.getTime();
  } else {
    value = val;
  }
  return Number(value);
}

export class ManualClock implements Clock {
  private _value: number = Date.now();

  constructor(initValue?: number) {
    const now = Date.now();
    this._value = arguments.length > 0 ? (initValue || now) : now;
  }

  clear(): void {
    this._value = 0;
  }

  getTime(): number {
    return this._value;
  }

  set(val: number | Date): this {
    if (typeof val !== 'number') {
      val = val.getTime();
    }
    this._value = val;
    return this;
  }

  advanceBy(delta: number): this {
    return this.set(this._value + delta);
  }
}

export function createAlignedClock(clock: Clock, interval: number): Clock {
  function getTime(): number {
    const value = clock.getTime();
    return value - (value % interval);
  }

  return {
    // set,
    clear: clock.clear,
    getTime,
  };
}

export function create(currentTimeFn?: () => number): Clock {
  currentTimeFn = currentTimeFn ?? (() => Date.now());

  let value: number;

  function clockFn() {
    let current = currentTimeFn?.() ?? Date.now();
    if (value && value < current) {
      current = value;
    }
    return current;
  }

  function set(val: unknown) {
    value = normalize(val);
  }

  function clear() {
    value = 0;
  }

  const getTime = () => clockFn();

  return {
    // set,
    clear,
    getTime,
  };
}

export const systemClock = create();
