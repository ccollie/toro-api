import { medianAbsoluteDeviation as MAD } from '../../../src/server/stats/mean-absolute-deviation';

describe('median absolute deviation', function () {
  it('should return the mad of an array of numbers', function () {
    expect(MAD([1, 4, 4, 1, 1])).toBe(0);
  });

  it('should return undefined for a 0-array', function () {
    expect(MAD([])).toBeUndefined();
  });

  it('should return zero for a 1-array', function () {
    expect(MAD([4])).toBe(0);
  });

  it('should not sort the array if it is already sorted', function () {
    expect(MAD([1, 4, 4, 1, 1], true)).toBe(3);
  });

  it('should return the correct MAD value - oddLen', function () {
    const arrOddLen = [-2, 1, 2, 2, 3, 4, 15];
    expect(MAD(arrOddLen)).toBe(1);
  });

  it('should return the correct MAD value - evenLen', function () {
    const arrEvenLen = [1, 2, 2, 3.4, 2.2, 19, 5.2, 1.3, 3.3, 4.1];
    expect(MAD(arrEvenLen).toFixed(2)).toBe('1.05');
  });
});
