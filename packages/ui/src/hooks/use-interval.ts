// https://github.com/beautifulinteractions/beautiful-react-hooks/blob/master/src/useInterval.js
import { useUpdateEffect } from './use-update-effect';
import { useEffect, useState, useRef, useLayoutEffect } from 'react';
type Timeout = ReturnType<typeof setTimeout>;
type TimerHandler = (...args: any[]) => void | Promise<void>;

export interface UseIntervalOptions {
  cancelOnUnmount?: boolean;
  immediate?: boolean;
}

const defaultOptions: UseIntervalOptions = {
  cancelOnUnmount: true,
  immediate: true,
};

/**
 * An async-utility hook that accepts a callback function and a delay time (in milliseconds), then
 * repeats the execution of the given function by the defined milliseconds.
 */
const useInterval = (
  fn: TimerHandler,
  milliseconds: number,
  options = defaultOptions
) => {
  const opts = { ...defaultOptions, ...(options || {}) };
  const timeout = useRef<Timeout>();
  const [isActive, setIsActive] = useState(false);

  const savedCallback = useRef(fn);

  // Remember the latest callback if it changes.
  useLayoutEffect(() => {
    savedCallback.current = fn;
  }, [fn]);

  async function run() {
    try {
      await savedCallback.current();
    } catch (e) {
      console.error(e);
    }
  }

  function start() {
    setIsActive(true);
    if (!timeout.current) {
      timeout.current = setTimeout(async function scheduledRun() {
        if (isActive) {
          await run();
          timeout.current = 0;
        }
        isActive && (timeout.current = setTimeout(scheduledRun, milliseconds));
      }, milliseconds);
    }
  }

  function stop() {
    setIsActive(false);
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = 0;
    }
  }

  const toggle = () => {
    if (isActive) {
      stop();
    } else {
      start();
    }
  };

  // when the milliseconds change, reset the timeout
  useUpdateEffect(() => {
    // if we're started, reset with the new delay
    if (isActive) {
      clearTimeout(timeout.current);
      timeout.current = 0;
      start();
    }
  }, [milliseconds]);

  useEffect(() => {
    // see if we need to execute on the leading edge
    if (opts.immediate) {
      run();
      start();
    }
    return () => {
      // when component unmount clear the timeout
      if (opts.cancelOnUnmount) {
        stop();
      }
    };
  }, []);

  return { isActive, start, stop, toggle };
};

export { useInterval };
export default useInterval;
