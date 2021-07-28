import {
  filterOutliers,
  getOutlierIndexes,
  getOutliers,
  OutlierMethod,
} from '../../../src/stats/outliers';
import { ArrEvenLen, ArrOddLen, RandomData } from './data';

describe('MAD', () => {
  function filter(data: number[], threshold?: number) {
    return filterOutliers(OutlierMethod.MAD, data, { threshold });
  }

  function getIndexes(data: number[], threshold?: number): number[] {
    return getOutlierIndexes(OutlierMethod.MAD, data, { threshold });
  }

  it('calculates using defaults', () => {
    const data = [-2, 1, 2, 2, 3, 4, 15];
    const indexes = getIndexes(data);
    expect(indexes).toStrictEqual([6]);

    const values = getOutliers(OutlierMethod.MAD, data);
    expect(values).toStrictEqual([15]);
  });

  describe('Indexes', () => {
    it('gets the indexes of outliers', () => {
      expect(getIndexes(RandomData).length).toBe(10);

      const arr = [5000, 4900, 1000, 3000, 4400, 1200300, 5000, 5500, 126500];
      expect(getIndexes(arr)).toStrictEqual([2, 5, 8]);
    });
  });

  describe('filters', function () {
    it('should return an array with two outliers removed given lower threshold', function () {
      const res = [1, 2, 2, 3, 4];
      expect(filter(ArrOddLen, 2.5)).toStrictEqual(res);
    });

    it('should return an array with one outlier removed using default threshold', function () {
      const res = [-2, 1, 2, 2, 3, 4];
      expect(filter(ArrOddLen)).toStrictEqual(res);
      expect(getIndexes(ArrOddLen).length).toBe(ArrOddLen.length - res.length);
    });

    it('should return an array with single outlier removed', function () {
      const res = [1, 2, 2, 3.4, 2.2, 5.2, 1.3, 3.3, 4.1];
      expect(filter(ArrEvenLen)).toStrictEqual(res);
      expect(getIndexes(ArrEvenLen)).toStrictEqual([5]);
    });

    it('should return an array with negative outliers removed', function () {
      const input = [1.1, 1.2, 2.2, -20, 3.3, 2.1, 2.3, -10.2];
      const expected = [1.1, 1.2, 2.2, 3.3, 2.1, 2.3];

      expect(filter(input)).toStrictEqual(expected);
      expect(getIndexes(input)).toStrictEqual([3, 7]);
    });

    it('should return an array with positive outliers removed', function () {
      const input = [1.1, 1.2, 2.2, 20, 3.3, 2.1, 2.3, 11];
      const res = [1.1, 1.2, 2.2, 3.3, 2.1, 2.3];
      expect(filter(input)).toStrictEqual(res);
    });

    it('should return an array with 2-sided outliers removed', function () {
      const input = [1.1, 1.2, 2.2, -20, 3.3, 2.1, 18.2, 2.3];
      const res = [1.1, 1.2, 2.2, 3.3, 2.1, 2.3];

      expect(filter(input)).toStrictEqual(res);
    });
  });
});
