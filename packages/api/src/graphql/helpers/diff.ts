/*!
 * Find the differences between two objects and push to a new object
 * (c) 2019 Chris Ferdinandi & Jascha Brinkmann,
 * MIT License, https://gomakethings.com & https://twitter.com/jaschaio
 * @param  {Object} obj1 The original object
 * @param  {Object} obj2 The object to compare against it
 * @return {Object}      An object of differences between the two
 */
import { isFunction, isObject } from 'lodash';

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
