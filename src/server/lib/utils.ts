import crypto from 'crypto';
import { get, isFunction, isNil, isObject } from 'lodash';

export function hash(data, algorithm = 'sha1'): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

export function objToString(hash): string {
  if (!hash) return '' + hash;
  const keys = Object.keys(hash).sort();
  return keys.reduce((res, k) => res + `${k}:${hash[k]}`, '');
}

export function hashObject(obj, algorithm = 'sha1'): string {
  const asString = objToString(obj);
  return hash(asString, algorithm);
}

export function safeParse(item): any {
  if (typeof item !== 'string' || !item.length) {
    return item;
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    return item;
  }
}

export const parseBool = (val: any): boolean => {
  const type = typeof val;
  if (type === 'boolean') return val;
  if (type === 'number') return !!val;
  return ['true', '1', 't'].includes(val.toLowerCase());
};

export const BULL_STATES = [
  'waiting',
  'active',
  'completed',
  'failed',
  'delayed',
];

export const isFinishedState = (state: string) =>
  ['completed', 'failed', 'removed'].includes(state);

export const isValidState = (state) => BULL_STATES.includes(state);

export function isNumber(num): boolean {
  if (typeof num === 'number') {
    return num - num === 0;
  }
  if (typeof num === 'string' && num.trim() !== '') {
    return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
  }
  return false;
}

export function isPromise(obj): boolean {
  return !!obj && (isObject(obj) || isFunction(obj)) && isFunction(obj['then']);
}

export function titleCase(str = ''): string {
  const elems: string[] = str.toLowerCase().split(' ');
  for (let i = 0; i < elems.length; i++) {
    elems[i] = elems[i].charAt(0).toUpperCase() + elems[i].slice(1);
  }
  return elems.join(' ');
}

export const firstChar = (str) => (str && str.length ? str[0] : '');

/**
 * Add commas to numbers
 *
 * @param {Number} `num`
 * @return {string}
 * @api public
 */
export const addCommas = (num) => {
  return num.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
};

/*!
 * Find the differences between two objects and push to a new object
 * (c) 2019 Chris Ferdinandi & Jascha Brinkmann,
 * MIT License, https://gomakethings.com & https://twitter.com/jaschaio
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
export function diff(obj1, obj2, { trackRemoved = true } = {}) {
  // Make sure an object to compare is provided
  if (!obj2 || !isObject(obj2)) {
    return obj1;
  }

  const diffs = {};

  /**
   * Check if two arrays are equal
   * @param  {Array}   arr1 The first array
   * @param  {Array}   arr2 The second array
   * @return {Boolean}      If true, both arrays are equal
   */
  function arraysMatch(arr1, arr2): boolean {
    // Check if the arrays are the same length
    if (arr1.length !== arr2.length) return false;

    // Check if all items exist and are in the same order
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }

    // Otherwise, return true
    return true;
  }

  /**
   * Compare two items and push non-matches to object
   * @param  {*}      item1 The first item
   * @param  {*}      item2 The second item
   * @param  {String} key   The key in our object
   */
  function compare(item1, item2, key) {
    // Get the object type
    const type1 = typeof item1;
    const type2 = typeof item2;

    // If type2 is undefined it has been removed
    if (type2 === 'undefined') {
      if (trackRemoved) {
        diffs[key] = null;
      }
      return;
    }

    // If items are different types
    if (type1 !== type2) {
      diffs[key] = item2;
      return;
    }

    // If an object, compare recursively
    if (isObject(item1)) {
      const objDiff = diff(item1, item2);
      if (objDiff && Object.keys(objDiff).length > 1) {
        diffs[key] = objDiff;
      }
      return;
    }

    // If an array, compare
    if (Array.isArray(obj1)) {
      if (!arraysMatch(item1, item2)) {
        diffs[key] = item2;
      }
      return;
    }

    // Else if it's a function, convert to a string and compare
    // Otherwise, just compare
    if (isFunction(obj1)) {
      if (item1.toString() !== item2.toString()) {
        diffs[key] = item2;
      }
    } else {
      if (item1 !== item2) {
        diffs[key] = item2;
      }
    }
  }

  //
  // Compare our objects
  //

  // Loop through the first object
  if (isObject(obj1)) {
    for (const key in obj1) {
      if (obj1.hasOwnProperty(key)) {
        compare(obj1[key], obj2[key], key);
      }
    }
  }

  // Loop through the second object and find missing items
  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (!obj1[key] && obj1[key] !== obj2[key]) {
        diffs[key] = obj2[key];
      }
    }
  }

  // Return the object of differences
  return diffs;
}

export function interpolate(
  str: string,
  values = {},
  defaultValue = undefined,
): string {
  return str.replace(/{{\s*([^}]*)\s*}}/g, (m, $1) =>
    get(values, $1.trim(), defaultValue),
  );
}

/**
 * Deep merge two objects.
 * @param target
 * @param sources
 */
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

/**
 * Abbreviate numbers to the given number of `precision`. This is for
 * general numbers, not size in bytes.
 *
 * @param {Number} `number`
 * @param {Number} `precision`
 * @param units
 * @return {String}
 * @api public
 */
export function abbreviateNumber(number, precision = 2, units): number {
  units = units || ['k', 'm', 'b', 't', 'q'];
  number = Number(number);
  // 2 decimal places => 100, 3 => 1000, etc.
  precision = Math.pow(10, precision);
  const abbr = ['k', 'm', 'b', 't', 'q'];
  let len = abbr.length - 1;

  while (len >= 0) {
    const size = Math.pow(10, (len + 1) * 3);
    if (size <= number + 1) {
      number = Math.round((number * precision) / size) / precision;
      // todo: detect and use Intl.Numberformat
      number += units[len];
      break;
    }
    len--;
  }
  return number;
}

export function formatBoomPayload(error) {
  return {
    ...error.output.payload,
    ...(isNil(error.data) ? {} : { data: error.data }),
  };
}
