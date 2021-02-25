import { systemClock } from './clock';
import Timeout = NodeJS.Timeout;

export interface AccurateInterval {
  start: () => void;
  stop: () => void;
}

/**
 * Create an accurate interval that does not skew over time.
 * @param  {function}   func            Function to call ever interval ms
 * @param  {number}     interval        Interval (in ms) with which to call func
 * @param  {Object}     opts            Function execution options
 * @param  {boolean}    opts.aligned    Align timestamps to multiples of interval
 * @param  {boolean}    opts.clock      the clock to use
 * @param  {boolean}    opts.immediate  Call func immediately as well
 * @return {Object}                     Object with clear method
 */
export function createAccurateInterval(
  func: () => void,
  interval: number,
  opts = {
    clock: systemClock,
    aligned: true,
    immediate: false,
    quitOnError: false,
  },
): AccurateInterval {
  let nextAt: number;
  let stopped = false;
  let now: number;
  let timeout: Timeout = null;

  function start(): void {
    if (!stopped) {
      return;
    }
    stopped = false;
    now = opts.clock.getTime();
    nextAt = now;

    if (opts.aligned) {
      nextAt += interval - (now % interval);
    }

    if (!opts.immediate) {
      nextAt += interval;
    }

    if (opts.immediate) {
      func();
    }

    tick();
  }

  function stop(): void {
    stopped = true;
    clearTimeout(timeout);
    timeout = null;
  }

  function tick(): void {
    if (!stopped) {
      now = opts.clock.getTime();
      // Calculate any drift that might have occurred.
      const drift = now - nextAt;

      // the drift is larger than the timer's interval we have to abandon ship.
      if (drift > interval) {
        if (opts.quitOnError) {
          stop();
          throw new Error(
            'The timer has encountered an error and cannot recover',
          );
        }
        if (opts.aligned) {
          nextAt = now - (now % interval);
        } else {
          nextAt = now;
        }
      }

      const delay = Math.max(0, nextAt - now);

      // @ts-ignore
      timeout = setTimeout(tick, delay);
      if (timeout.unref) timeout.unref();
      nextAt += interval;
      func();
    }
  }

  return {
    start,
    stop,
  };
}
