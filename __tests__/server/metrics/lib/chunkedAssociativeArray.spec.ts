/*global describe, it, beforeEach, afterEach*/
'use strict';
import { ChunkedAssociativeArray } from '../../common';
import { getRandomIntArray } from '../../utils';
import random from 'lodash/random';

describe('ChunkedAssociativeArray', function () {
  function populate(array: ChunkedAssociativeArray): void {
    const count = random(5, 50);
    for (let i = 0; i < count; i++) {
      array.put(i, random());
    }
  }

  describe('.trim', () => {
    it('trims out of range values', () => {
      const array = new ChunkedAssociativeArray(3);
      array.put(-3, 3);
      array.put(-2, 1);
      array.put(0, 5);
      array.put(3, 0);
      array.put(9, 8);
      array.put(15, 0);
      array.put(19, 5);
      array.put(21, 5);
      array.put(34, -9);
      array.put(109, 5);

      expect(array.out())
        // eslint-disable-next-line max-len
        .toBe(
          '[(-3: 3) (-2: 1) (0: 5) ]->[(3: 0) (9: 8) (15: 0) ]->[(19: 5) (21: 5) (34: -9) ]->[(109: 5) ]',
        );
      expect(array.getValues()).toEqual([3, 1, 5, 0, 8, 0, 5, 5, -9, 5]);
      expect(array.size()).toEqual(10);

      array.trim(-2, 20);

      expect(array.out()).toBe(
        '[(-2: 1) (0: 5) ]->[(3: 0) (9: 8) (15: 0) ]->[(19: 5) ]',
      );
      expect(array.getValues()).toEqual([1, 5, 0, 8, 0, 5]);
      expect(array.size()).toBe(6);
    });
  });

  describe('.length', () => {
    it('should get the length of the array', () => {
      const array = new ChunkedAssociativeArray(3);
      expect(array.length).toBe(0);

      const expected = random(5, 50);
      for (let i = 0; i < expected; i++) {
        array.put(i, random());
      }
      expect(array.length).toBe(expected);
    });
  });

  describe('.getValues', () => {
    it('should get all values', () => {
      const array = new ChunkedAssociativeArray(3);
      const expected = getRandomIntArray(10);
      expected.forEach((value, index) => array.put(index, value));
      expect(array.getValues()).toEqual(expected);
    });

    it('gets values within a range', () => {
      const array = new ChunkedAssociativeArray(3);
      array.put(-3, 3);
      array.put(-2, 1);
      array.put(0, 5);
      array.put(3, 0);
      array.put(9, 8);
      array.put(15, 72);
      array.put(19, 39);
      array.put(21, 5);
      array.put(34, -9);
      array.put(109, 5);

      const values = array.getValues(0, 19);
      expect(values).toEqual([5, 0, 8, 72, 39]);
    });

    it('defaults to the last key if no end is specified', () => {
      const array = new ChunkedAssociativeArray(3);
      array.put(-3, 3);
      array.put(-2, 1);
      array.put(13, 21);
      array.put(21, 5);
      array.put(33, -32);
      array.put(54, 24);

      const values = array.getValues(13);
      expect(values).toEqual([21, 5, -32, 24]);
    });
  });

  describe('.firstKey', () => {
    it('returns the first key', () => {
      const array = new ChunkedAssociativeArray(3);
      array.put(-3, 3);
      array.put(-2, 1);
      array.put(0, 5);
      array.put(3, 0);
      array.put(9, 8);

      expect(array.firstKey).toBe(-3);
    });

    it('should return undefined for an empty list', () => {
      const arr = new ChunkedAssociativeArray(4);
      expect(arr.firstKey).toBeUndefined();
    });
  });

  describe('.lastKey', () => {
    it('returns the last key', () => {
      const array = new ChunkedAssociativeArray(3);
      array.put(-2, 14);
      array.put(0, 1);
      array.put(64, 32);
      array.put(72, 32);
      array.put(100, 23);

      expect(array.lastKey).toBe(100);
    });

    it('should return undefined for an empty list', () => {
      const arr = new ChunkedAssociativeArray(4);
      expect(arr.lastKey).toBeUndefined();
    });
  });

  describe('.clear', () => {
    it('should clear the contents of the array', () => {
      const array = new ChunkedAssociativeArray(3);
      populate(array);

      expect(array.length).toBeTruthy();
      array.clear();
      expect(array.length).toBe(0);
    });
  });
});
