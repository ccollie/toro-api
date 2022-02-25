/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type NoArgCallback<T> = () => T;

// utility types:
/**
 * XOR for some properties applied to a type
 * (XOR is one of these but not both or neither)
 *
 * Usage: OneOf<typeToExtend, one | but | not | multiple | of | these | are | required>
 *
 * To require aria-label or aria-labelledby but not both
 * Example: OneOf<Type, 'aria-label' | 'aria-labelledby'>
 */
export type OneOf<T, K extends keyof T> = Omit<T, K> &
  { [k in K]: Pick<Required<T>, k> & { [k1 in Exclude<K, k>]?: never } }[K];

/**
 * Like `keyof typeof`, but for getting values instead of keys
 * ValueOf<typeof {key1: 'value1', key2: 'value2'}>
 * Results in `'value1' | 'value2'`
 */
export type ValueOf<T> = T[keyof T];

/*
https://github.com/Microsoft/TypeScript/issues/28339
Problem: Pick and Omit do not distribute over union types, which manifests when
optional values become required after a Pick or Omit operation. These
Distributive forms correctly operate on union types, preserving optionality.
 */
type UnionKeys<T> = T extends any ? keyof T : never;
export type DistributivePick<T, K extends UnionKeys<T>> = T extends any
  ? Pick<T, Extract<keyof T, K>>
  : never;
export type DistributiveOmit<T, K extends UnionKeys<T>> = T extends any
  ? Omit<T, Extract<keyof T, K>>
  : never;
type RecursiveDistributiveOmit<T, K extends PropertyKey> = T extends any
  ? T extends object
    ? RecursiveOmit<T, K>
    : T
  : never;
export type RecursiveOmit<T, K extends PropertyKey> = Omit<
  { [P in keyof T]: RecursiveDistributiveOmit<T[P], K> },
  K
  >;

/**
 * Returns member keys in U not present in T set to never
 * T = { 'one', 'two', 'three' }
 * U = { 'three', 'four', 'five' }
 * returns { 'four': never, 'five': never }
 */
export type DisambiguateSet<T, U> = {
  [P in Exclude<keyof T, keyof U>]?: never;
};

/**
 * Allow either T or U, preventing any additional keys of the other type from being present
 */
// eslint-disable-next-line max-len
export type ExclusiveUnion<T, U> = T | U extends object // if there are any shared keys between T and U
  ? (DisambiguateSet<T, U> & U) | (DisambiguateSet<U, T> & T) // otherwise the TS union is already unique
  : T | U;

/**
 * Replaces all properties on any type as optional, includes nested types
 *
 * @example
 * ```ts
 * interface Person {
 *  name: string;
 *  age?: number;
 *  spouse: Person;
 *  children: Person[];
 * }
 * type PartialPerson = RecursivePartial<Person>;
 * // results in
 * interface PartialPerson {
 *  name?: string;
 *  age?: number;
 *  spouse?: RecursivePartial<Person>;
 *  children?: RecursivePartial<Person>[]
 * }
 * ```
 */
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends NonAny[] // checks for nested any[]
    ? T[P]
    : T[P] extends readonly NonAny[] // checks for nested ReadonlyArray<any>
      ? T[P]
      : T[P] extends Array<infer U>
        ? Array<RecursivePartial<U>>
        : T[P] extends ReadonlyArray<infer U>
          ? ReadonlyArray<RecursivePartial<U>>
          : T[P] extends Set<infer V> // checks for Sets
            ? Set<RecursivePartial<V>>
            : T[P] extends Map<infer K, infer V> // checks for Maps
              ? Map<K, RecursivePartial<V>>
              : T[P] extends NonAny // checks for primitive values
                ? T[P]
                : RecursivePartial<T[P]>; // recurse for all non-array and non-primitive values
};
type NonAny = number | boolean | string | symbol | null;
