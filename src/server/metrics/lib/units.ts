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
