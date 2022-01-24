// https://github.com/beautifulinteractions/beautiful-react-hooks/blob/master/src/useInterval.js
import { useCallbackRef } from './use-callback-ref';
import { useUpdateEffect } from './use-update-effect';
import { useEffect, useState, useCallback, useRef } from 'react';
type Timeout = ReturnType<typeof setInterval>;

type Delay = number | null;
type TimerHandler = (...args: never[]) => void;

export interface UseIntervalOptions {
  cancelOnUnmount?: boolean;
  immediate?: boolean;
}

const defaultOptions: UseIntervalOptions = {
  cancelOnUnmount: true,
  immediate: true,
};

/**
 * An async-utility hook that accepts a callback function and a delay time (in milliseconds), then repeats the
 * execution of the given function by the defined milliseconds.
 */
const useInterval = (
  fn: TimerHandler,
  milliseconds: Delay,
  options = defaultOptions
) => {
  const opts = { ...defaultOptions, ...(options || {}) };
  const timeout = useRef<Timeout>();
  const callback = useCallbackRef(fn);
  const [isCleared, setIsCleared] = useState(false);

  function setup() {
    if (typeof milliseconds === 'number') {
      if (timeout.current) {
        clearInterval(timeout.current);
      }
      timeout.current = setInterval(callback, milliseconds);
    }
  }

  // the clear method
  const clear = useCallback(() => {
    if (timeout.current) {
      setIsCleared(true);
      clearInterval(timeout.current);
    }
  }, []);

  const reset = useCallback(() => {
    setup();
    setIsCleared(false);
  }, []);

  // when the milliseconds change, reset the timeout
  useUpdateEffect(() => {
    reset();
    // cleanup previous interval
    return clear;
  }, [milliseconds]);

  // see if we need to execute on the leading edge
  useEffect(() => {
    if (opts.immediate) {
      fn();
    }
    setup();
    return () => {
      // when component unmount clear the timeout
      if (opts.cancelOnUnmount) {
        clear();
      }
    };
  }, []);

  return { isCleared, clear, reset };
};

export { useInterval };
export default useInterval;
