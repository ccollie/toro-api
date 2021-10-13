import {
  filterOutlierObjects,
  getOutlierIndexes,
  getOutlierObjects,
  getOutlierPredicate,
  getOutliers,
  OutlierMethod,
} from '../../../src/stats/outliers';
import { ArrOddLen, RandomData } from './data';


describe('index', () => {
  describe('getOutlierPredicate', () => {
    it('can get a predicate for all supported methods', () => {
      const keys = Object.keys(OutlierMethod);
      keys.forEach((k) => {
        // ignore numeric keys
        if (!isNaN(parseInt(k))) return;
        const pred = getOutlierPredicate(OutlierMethod[k], ArrOddLen);
        expect(typeof pred).toBe('function');
      });
    });
  });

  describe('getOutlierIndexes', () => {
    it('can get outlier indexes', () => {
      const actual = getOutlierIndexes(OutlierMethod.MAD, RandomData);
      expect(actual.length).toBe(10);
    });
  });

  describe('getOutliers', () => {
    it('can get outliers', () => {
      const data = [12, 14, 51, 12, 10, 9, 16, 1];
      const actual = getOutliers(OutlierMethod.IQR, data);
      expect(actual).toStrictEqual([51, 1]);
    });
  });

  describe('getOutlierObjects', () => {
    it('can get outliers from a list of objects', () => {
      const arr = [5000, 4900, 1000, 3000, 4400, 1200300, 5000, 5500, 126500];
      const expectedIndexes = [2, 5, 8];

      const now = 10;
      const objList: { ts: number, value: number }[] = arr.map((x) => ({
        ts: now + 5,
        value: x,
      }));

      const outliers = getOutlierObjects(
        OutlierMethod.MAD,
        objList,
        (x) => x.value,
      );
      expectedIndexes.forEach((index, i) => {
        const actual = outliers[i];
        const expected = objList[index];
        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('filterOutlierObjects', () => {
    it('can filter outliers from a list of objects', () => {
      const res = [1, 2, 2, 3, 4];
      const now = Date.now();

      const objList:  { ts: number, value: number }[] = ArrOddLen.map((x) => ({
        ts: now + 5,
        value: x,
      }));
      const filtered = filterOutlierObjects(
        OutlierMethod.MAD,
        objList,
        (x) => x.value,
        { threshold: 2.5 },
      );
      expect(filtered.map((x) => x.value)).toStrictEqual(res);
    });
  });
});
