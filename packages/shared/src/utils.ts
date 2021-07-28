import crypto from 'crypto';
import { get, isFunction, isObject } from 'lodash';

export function hash(data: any, algorithm = 'sha1'): string {
  return crypto.createHash(algorithm).update(data).digest('hex');
}

export function objToString(hash: Record<string, any>): string {
  if (!isObject(hash)) {
    return `${hash}`;
  }
  const keys = Object.keys(hash).sort();
  const parts = keys.map((key) => {
    const val = hash[key];
    return key + ':' + (typeof val === 'object' ? objToString(val) : '' + val);
  });
  return parts.join('');
}

export function hashObject(
  obj: Record<string, any>,
  algorithm = 'sha1',
): string {
  const asString = objToString(obj);
  return hash(asString, algorithm);
}

export function safeParse(item: string): any {
  if (typeof item !== 'string' || !item.length) {
    return item;
  }
  try {
    return JSON.parse(item);
  } catch (e) {
    return item;
  }
}

export function safeParseInt(
  val: unknown,
  defaultValue?: number,
): number | undefined {
  if (val === undefined || val === null) return defaultValue;
  const type = typeof val;
  let candidate: number;
  if (type === 'number') return val as number;
  if (type === 'string') {
    candidate = parseInt(val as string, 10);
  } else {
    candidate = Number(val);
  }
  return isNaN(candidate) ? defaultValue : candidate;
}

export function parseBool(val: unknown, defaultVal?: boolean): boolean {
  const type = typeof val;
  if (val === null || type === 'undefined') {
    return arguments.length > 1 ? defaultVal : false;
  }
  if (type === 'boolean') return val as boolean;
  if (type === 'number') return !!val;
  return ['true', '1', 't'].includes(val.toString().toLowerCase());
}

export const isFinishedStatus = (state: string): boolean =>
  ['completed', 'failed', 'removed'].includes(state);

export function isNumber(num: string | number): boolean {
  if (typeof num === 'number') {
    return num - num === 0;
  }
  if (typeof num === 'string' && num.trim() !== '') {
    return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
  }
  return false;
}

export function isPromise(obj: any): boolean {
  return !!obj && (isObject(obj) || isFunction(obj)) && isFunction(obj['then']);
}

export function titleCase(str = ''): string {
  const elements: string[] = str.toLowerCase().split(' ');
  for (let i = 0; i < elements.length; i++) {
    elements[i] = elements[i].charAt(0).toUpperCase() + elements[i].slice(1);
  }
  return elements.join(' ');
}

export const firstChar = (str: string): string =>
  str && str.length ? str[0] : '';

/*!
 * Find the differences between two objects and push to a new object
 * (c) 2019 Chris Ferdinandi & Jascha Brinkmann,
 * MIT License, https://gomakethings.com & https://twitter.com/jaschaio
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
export function diff(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
  { trackRemoved = true } = {},
): Record<string, unknown> {
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
  function compare(item1, item2, key): void {
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
      const objDiff = diff(item1 as Record<string, unknown>, item2);
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

export function randomString(length = 8): string {
  return crypto.randomBytes(length).toString('hex');
}

export function getStaticProp(obj: any, name: string): any {
  return (obj?.constructor ?? {})[name];
}

const EnglishOrdinalRules = new Intl.PluralRules('en', { type: 'ordinal' });
const suffixes = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

export function ordinal(number: number): string {
  const suffix = suffixes[EnglishOrdinalRules.select(number)];
  return number + suffix;
}

export const escapeRegExp = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};
