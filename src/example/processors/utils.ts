import crypto from 'crypto';
import PD from 'probability-distributions';
import { format, startOfDay, differenceInSeconds } from 'date-fns';

export function getRandomString(length: number): string {
  return crypto.randomBytes(length).toString('hex');
}

export function getOrderNumber(): string {
  return crypto.randomBytes(8).toString('hex');
}

export const sleep = (t: number, v = undefined): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(v), t);
  });
};

/***
 * Generate an array of n random numbers which add up to total
 * @param {Number} n the number of items
 * @param {Number} total total requested
 * @returns {Number[]} an array of numbers adding to total
 */
export function getRandDistArray(n: number, total: number): number[] {
  const randArray = new Array(n).fill(0);
  let sum = 0;

  // Generate n random numbers
  for (let i = 0; i < randArray.length; i++) {
    randArray[i] = Math.random();
    sum += randArray[i];
  }

  // Normalize sum to m
  for (let i = 0; i < randArray.length; i++) {
    randArray[i] /= sum;
    randArray[i] *= total;
  }
  return randArray;
}

const DATE_FORMAT = 'yyyy-MM-dd';

export function getTimestampString(date = undefined) {
  date = date || new Date();
  const dayStart = startOfDay(date);
  const secs = differenceInSeconds(date, dayStart);
  const base = format(dayStart, DATE_FORMAT);
  return `${base}-${secs}`;
}

/**
 * Formats the number into "human readable" number/
 *
 * @param {Number} num The number to format.
 * @returns {string} The number as a string or error text if we couldn't
 *   format it.
 */
export function formatBytes(num: number): string {
  if (!Number.isFinite(num)) {
    return 'Could not retrieve value';
  }

  const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  const neg = num < 0;
  if (neg) num = -num;

  if (num < 1) {
    return (neg ? '-' : '') + num + ' B';
  }

  const exponent = Math.min(
    Math.floor(Math.log(num) / Math.log(1024)),
    UNITS.length - 1,
  );
  const numStr = Number((num / Math.pow(1024, exponent)).toPrecision(3));
  const unit = UNITS[exponent];

  return `${neg ? '-' : ''}${numStr} ${unit}`;
}

export function rand(min: number, max: number): number {
  return Math.floor(PD.prng() * (max - min + 1)) + min;
}
