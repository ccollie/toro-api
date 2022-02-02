import crypto from 'crypto';

export type Dict<T = any> = Record<string, T>;

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export const isNotNumber = (value: unknown): boolean =>
  typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value);

export function isNumeric(value: any): boolean {
  return value != null && value - parseFloat(value) + 1 >= 0;
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// Array assertions
export function isArray<T>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

export const capitalize = (str: string) => {
  if (!str) return str;
  return `${str.charAt(0).toUpperCase()}${str.slice(1).toLowerCase()}`;
};

export const lowerCase = (str: string): string => {
  if (!str) return str;
  return str.toLowerCase();
};

export const upperCase = (str: string): string => {
  if (!str) return str;
  return str.toUpperCase();
};

export function titleCase(str = ''): string {
  const elements: string[] = str.toLowerCase().split(' ');
  for (let i = 0; i < elements.length; i++) {
    elements[i] = elements[i].charAt(0).toUpperCase() + elements[i].slice(1);
  }
  return elements.join(' ');
}

//#Source https://bit.ly/2neWfJ2
export const snakeCase = (str: string) =>
  str &&
  str
    .match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
    .map(x => x.toLowerCase())
    .join('_');

export const isEmptyArray = (value: unknown) =>
  isArray(value) && value.length === 0;

export const isRegExp = (value: unknown): value is RegExp =>
  value instanceof RegExp;

// Function assertions
export function isFunction(value: unknown): boolean {
  return typeof value === 'function';
}

// Generic assertions
export const isDefined = (value: unknown): boolean =>
  typeof value !== 'undefined' && value !== undefined;

export const isUndefined = (value: unknown): value is undefined =>
  typeof value === 'undefined' || value === undefined;

export function isNil(value: unknown): boolean {
  return value === null || value === undefined;
}

// Object assertions
export const isObject = (value: unknown): value is Dict => {
  const type = typeof value;
  return (
    value != null &&
    (type === 'object' || type === 'function') &&
    !isArray(value)
  );
};

export const isEmptyObject = (value: unknown): boolean =>
  isObject(value) && Object.keys(value).length === 0;

export const isPrimitive = (val: unknown) => Object(val) !== val;

export const isNull = (value: unknown): value is null => value == null;

// String assertions
export function isString(value: unknown): value is string {
  return Object.prototype.toString.call(value) === '[object String]';
}

// Empty assertions
export const isEmpty = (value: unknown): boolean => {
  if (isArray(value)) return isEmptyArray(value);
  if (isObject(value)) return isEmptyObject(value);
  return value == null || value === '';
};

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

// this does not try to be comprehensive, simply covering some cases
// from lodash
export const isEqual = (value: unknown, other: unknown): boolean => {
  const typea = typeof value;
  const typeb = typeof other;
  if (typea !== typeb) return false;
  if (isPrimitive(value)) {
    return value === other;
  }
  if (isArray(value) && isArray(other)) {
    const arr1 = value as Array<unknown>;
    const arr2 = value as Array<unknown>;
    if (arr1.length !== arr2.length) return false;
    return arr1.every((val, index) => isEqual(val, arr2[index]));
  }
  if (isDate(value) && isDate(other)) {
    return value === other;
  }
  if (isObject(value) && isObject(other)) {
    const keys1 = Object.keys(value);
    const keys2 = Object.keys(other);
    if (keys1.length !== keys2.length) return false;
    const s1 = keys1.sort();
    const s2 = keys2.sort();
    if (!s1.every((val, index) => isEqual(s2[index], val))) return false;
    const h1 = hashObject(value);
    const h2 = hashObject(other);
    return h1 == h2;
  }
  return value == other;
};

export function isDate(value: unknown): value is Date {
  return Object.prototype.toString.call(value) === '[object Date]';
}

export const isValidDate = (d: unknown) => isDate(d) && !isNaN(d.valueOf());

export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return !!value && isObject(value) && isFunction(value.then);
}

export function dropWhile<T>(
  array: T[],
  predicate: (value: T, index: number) => boolean,
): T[] {
  let i = 0;
  while (i < array.length && predicate(array[i], i)) {
    i++;
  }
  return array.slice(i);
}

export function uniq<T>(array: T[]): T[] {
  const items = new Set<T>(array);
  return Array.from(items);
}

export function uniqWith<T>(
  array: T[],
  predicate: (a: T, b: T, index?: number) => boolean,
): T[] {
  const result: T[] = [];
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    if (result.every((v) => !predicate(v, value, i))) {
      result.push(value);
    }
  }
  return result;
}

export function uniqBy<T, TUniq>(
  array: T[],
  iteratee: (value: T) => TUniq,
): T[] {
  const result: T[] = [];
  const seen = new Set<TUniq>();
  for (let i = 0; i < array.length; i++) {
    const value = array[i];
    const key = iteratee(value);
    if (!seen.has(key)) {
      result.push(value);
      seen.add(key);
    }
  }
  return result;
}

export function initial<T>(array: T[]): T[] {
  return !array?.length ? [] : array.slice(0, array.length - 1);
}

export function take<T>(array: T[], n: number): T[] {
  return array?.length ? array.slice(0, n) : [];
}

export function get(
  obj: any,
  path: string | Array<string | number>,
  defaultValue: unknown = undefined,
): any {
  if (!obj) {
    return defaultValue;
  }

  const travel = (regexp: RegExp) => {
    if (Array.isArray(path)) {
      return path.filter(Boolean).reduce((obj, key) => obj?.[key], obj);
    }
    return String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) => (res !== null && res !== undefined ? res[key] : res),
        obj,
      );
  };
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

const hasOwnProperty = Object.prototype.hasOwnProperty;

// WARNING: This is not a drop in replacement solution, and
// it might not work for some edge cases. Test your code!
export function has(obj: Record<string, unknown>, key: string): boolean {
  if (!obj) {
    return false;
  }
  const keyParts = key.split('.');
  if (keyParts.length === 1) {
    return hasOwnProperty.call(obj, key);
  }
  const field = obj[keyParts[0]];
  const rest = keyParts.slice(1).join('.');
  return isObject(field) && has(field, rest);
}

export function first<T>(items: T[]): T | undefined {
  return items.length ? items[0] : undefined;
}

export function last<T>(items: T[]): T | undefined {
  return items.length ? items[items.length - 1] : undefined;
}

export function flatMap<T, U>(array: T[], mapFunc: (x: T) => U[]): U[] {
  return array.reduce(
    (cumulus: U[], next: T) => [...mapFunc(next), ...cumulus],
    <U[]>[],
  );
}

export function flatten(array: Array<any>): Array<any> {
  return array.reduce((cumulus, next) => [...next, ...cumulus], [] as Array<any>);
}

export function chunk<T = unknown>(array: T[], size = 1): T[][] {
  size = Math.max(size, 0);
  const length = array == null ? 0 : array.length;
  if (!length || size < 1) {
    return [];
  }
  let index = 0;
  let resIndex = 0;
  const result = new Array(Math.ceil(length / size));

  while (index < length) {
    result[resIndex++] = slice(array, index, (index += size));
  }
  return result;
}

export function slice<T>(array: T[], start?: number, end?: number): T[] {
  let length = array == null ? 0 : array.length;
  if (!length) {
    return [];
  }
  start = start ?? 0;
  end = end  ?? length;

  if (start < 0) {
    start = -start > length ? 0 : (length + start);
  }
  end = end > length ? length : end;
  if (end < 0) {
    end += length;
  }
  length = start > end ? 0 : ((end - start) >>> 0);
  start >>>= 0;

  let index = -1;
  const result = new Array(length);
  while (++index < length) {
    result[index] = array[index + start];
  }
  return result;
}

/**
 * Converts a value to a specific precision (or decimal points).
 *
 * Returns a string representing a number in fixed-point notation.
 *
 * @param value the value to convert
 * @param precision the precision or decimal points
 */
export function round(value: number, precision?: number): number {
  const scaleFactor = 10 ** (precision ?? 10);
  const nextValue = Math.round(value * scaleFactor) / scaleFactor;
  return precision ? parseFloat(nextValue.toFixed(precision)) : nextValue;
}

export function random(
  lower?: number,
  upper?: boolean | number,
  floating?: boolean,
): number {
  let lowerValue = lower;
  let upperValue: number;

  if (floating && typeof floating != 'boolean') {
    upper = floating = undefined;
  }
  if (floating === undefined) {
    if (typeof upper == 'boolean') {
      floating = upper;
      upper = undefined;
    } else if (typeof lower == 'boolean') {
      floating = lower;
      lower = undefined;
    }
  }
  if (lower === undefined && upper === undefined) {
    lowerValue = 0;
    upperValue = 1;
  } else {
    lowerValue = lower;
    if (upper === undefined) {
      upperValue = lower;
      lowerValue = 0;
    } else if (typeof upper === 'boolean') {
      floating = upper;
    } else {
      upperValue = upper;
    }
  }
  if (lowerValue > upperValue) {
    const temp = lowerValue;
    lowerValue = upperValue;
    upperValue = temp;
  }
  if (floating || lowerValue % 1 || upperValue % 1) {
    const rand = Math.random();
    return Math.min(
      lower +
        rand *
          (upperValue - lower + parseFloat('1e-' + ((rand + '').length - 1))),
      upperValue,
    );
  }
  return baseRandom(lower, upper);
}

/**
 * The base implementation of `_.random` without support for returning
 * floating-point numbers.
 *
 * @private
 * @param {number} lower The lower bound.
 * @param {number} upper The upper bound.
 * @returns {number} Returns the random number.
 */
function baseRandom(lower, upper) {
  return lower + Math.floor(Math.random() * (upper - lower + 1));
}

export function sample<T>(arr: T[]): T {
  const len = arr == null ? 0 : arr.length;
  return len ? arr[Math.floor(Math.random() * len)] : undefined;
}

export function sampleSize<T>(arr: T[], n = 1): T[] {
  const result: T[] = [];
  while (n-- > 0) {
    result.push(sample(arr));
  }
  return result;
}
