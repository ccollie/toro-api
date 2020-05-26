// A clock that gets its value from a stream id if its less than
// the current time or the current time otherwise

import { isDate } from 'lodash';

export interface SystemClock {
  set(val);
  clear();
  now(): number;
}

export function create(currentTimeFn = undefined): SystemClock {
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
    const type = typeof val;
    if (type === 'string') {
      val = val.split(val, '-')[0];
      value = parseInt(val);
    } else if (isDate(val)) {
      value = val.getTime();
    } else {
      value = val;
    }
  }

  function clear() {
    value = null;
  }

  const now = () => clockFn();

  return {
    set,
    clear,
    now,
  };
}

export const systemClock = create();
