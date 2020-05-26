import { toDate, startOfHour, startOfDay, addMilliseconds } from 'date-fns';
import { systemClock } from './clock';

const ONE_HOUR = 1000 * 60 * 60;

/**
 * Round start of timer based on a reference (start) datetime.
 * If the interval is less than an hour we increment based on the start of the hour.
 * With windows of an hour or more, the time windows are incremented based on the start
 * of the day, at 12:00 AM.
 * @param {Number} interval the interval in milliseconds
 * @param {Date|Number} date the reference date
 * @returns {Date}
 */
export function roundStartTime(interval: number, date: Date | number): Date {
  const base = toDate(date || systemClock.now());
  const start = interval < ONE_HOUR ? startOfHour(base) : startOfDay(base);
  const roundingIncrement = interval - (start.getTime() % interval);
  return addMilliseconds(start, roundingIncrement);
}

/**
 * Create an accurate interval that does not skew over time.
 * @param  {function}   func            Function to call ever interval ms
 * @param  {number}     interval        Interval (in ms) with which to call func
 * @param  {Object}     opts            Function execution options
 * @param  {boolean}    opts.aligned    Align timestamps to multiples of interval
 * @param  {boolean}    opts.immediate  Call func immediately as well
 * @return {Object}                     Object with clear method
 */
export function accurateInterval(
  func: Function,
  interval: number,
  opts = { aligned: true, immediate: false },
) {
  let nextAt, timeout;
  let stopped = false;

  let now = systemClock.now();

  nextAt = now;

  if (opts.aligned) {
    nextAt += interval - (now % interval);
  }

  if (!opts.immediate) {
    nextAt += interval;
  }

  timeout = null;

  function clear(): void {
    stopped = true;
    return clearTimeout(timeout);
  }

  function tick(): void {
    if (!stopped) {
      now = systemClock.now();
      // Calculate any drift that might have occurred.
      const drift = now - nextAt;

      // the drift is larger than the timer's interval we have to abandon ship.
      if (drift > interval) {
        clear();
        throw new Error(
          'The timer has encountered an error and cannot recover',
        );
      }

      const delay = Math.max(0, nextAt - now);
      timeout = setTimeout(tick, delay);
      if (timeout.unref) timeout.unref();
      nextAt += interval;
      func();
    }
  }

  if (opts.immediate) {
    func();
  }

  tick();

  return {
    clear,
  };
}
