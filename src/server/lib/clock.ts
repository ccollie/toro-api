// A clock that gets its value from a stream id if its less than
// the current time or the current time otherwise

import { isDate } from 'lodash';

export interface Clock {
  //set(val);
  clear();
  getTime(): number;
}

function normalize(val: any): number {
  const type = typeof val;
  let value;
  if (type === 'string') {
    val = val.split(val, '-')[0];
    value = parseInt(val);
  } else if (isDate(val)) {
    value = val.getTime();
  } else {
    value = val;
  }
  return value;
}

export class ManualClock implements Clock {
  private _value: number = Date.now();

  constructor(initValue?: number) {
    this._value = arguments.length > 0 ? initValue : Date.now();
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

export function create(currentTimeFn = undefined): Clock {
  currentTimeFn = currentTimeFn || (() => Date.now());

  let value = null;

  function clockFn() {
    let current = currentTimeFn();
    if (value && value < current) {
      current = value;
    }
    return current;
  }

  function set(val) {
    value = normalize(val);
  }

  function clear() {
    value = null;
  }

  const getTime = () => clockFn();

  return {
    // set,
    clear,
    getTime,
  };
}

export const systemClock = create();
