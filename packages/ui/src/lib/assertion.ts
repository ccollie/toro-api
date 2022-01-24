import { ChangeEvent } from 'react';
import { Dict } from '@/types';
import { hashObject } from '@/lib/utils';

// Number assertions
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

export const isEmptyArray = (value: unknown) =>
  isArray(value) && value.length === 0;

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

// Event assertions
export function isInputEvent(value: unknown): value is ChangeEvent {
  return isObject(value) && isObject(value.target) as boolean;
}

// Empty assertions
export const isEmpty = (value: unknown): boolean => {
  if (isArray(value)) return isEmptyArray(value);
  if (isObject(value)) return isEmptyObject(value);
  return value == null || value === '';
};

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

// eslint-disable-next-line @typescript-eslint/naming-convention
export const __DEV__ = process.env.NODE_ENV !== 'production';
