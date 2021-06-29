/**
 * Time units, as found in Java:
 * {@link http://download.oracle.com/javase/6/docs/api/java/util/concurrent/TimeUnit.html}
 * @module timeUnits
 * @example
 * const timeUnit = require('measured-core').unit
 * setTimeout(() => {}, 5 * timeUnit.MINUTES)
 */

/**
 * nanoseconds in milliseconds
 * @type {number}
 */
export const NANOSECONDS = 1 / (1000 * 1000);
/**
 * microseconds in milliseconds
 * @type {number}
 */
export const MICROSECONDS = 1 / 1000;
/**
 * milliseconds in milliseconds
 * @type {number}
 */
export const MILLISECONDS = 1;
/**
 * seconds in milliseconds
 * @type {number}
 */
export const SECONDS = 1000 * MILLISECONDS;
/**
 * minutes in milliseconds
 * @type {number}
 */
export const MINUTES = 60 * SECONDS;
/**
 * hours in milliseconds
 * @type {number}
 */
export const HOURS = 60 * MINUTES;
/**
 * days in milliseconds
 * @type {number}
 */
export const DAYS = 24 * HOURS;

export const ONE_MINUTE = 1 * MINUTES;
export const FIVE_MINUTES = 5 * MINUTES;
export const FIFTEEN_MINUTES = 15 * MINUTES;
export const DEFAULT_RATE_UNIT = ONE_MINUTE;

export enum TimeUnit {
  MILLISECONDS = 'Milliseconds',
  MINUTES = 'Minutes',
  SECONDS = 'Seconds',
  HOURS = 'Hours',
}

export const IntervalMillis: Record<TimeUnit, number> = {
  [TimeUnit.MILLISECONDS]: 1,
  [TimeUnit.MINUTES]: ONE_MINUTE,
  [TimeUnit.SECONDS]: 1 * SECONDS,
  [TimeUnit.HOURS]: 1 * HOURS,
};
