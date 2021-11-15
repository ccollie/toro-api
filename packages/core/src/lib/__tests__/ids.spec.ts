import { getTimestampFromId, getUniqueId } from '../../ids/index';
import { uniq } from 'lodash';

describe('ids', () => {
  describe('getUniqueId()', () => {
    it('can get a unique id', () => {
      const id = getUniqueId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('can be cast to BigInt', () => {
      const id = getUniqueId();
      const asNum = BigInt(id);
    });

    it('can be called in rapid succession without generating duplicates', () => {
      const generated = [];
      for (let i = 0; i < 500; i++) {
        generated.push(getUniqueId());
      }
      const unique = uniq(generated);
      expect(unique.length).toBe(generated.length);
    });
  });

  describe('getTimestampFromId', () => {
    it('returns the timestamp of when the id was created', () => {
      const now = +new Date();
      const id = getUniqueId();
      const actual = getTimestampFromId(id);
      expect(actual).toBe(now);
    });
  });
});
