import { median } from '../../../src/server/stats/median';

describe('median', function () {
  it('should return the median of an odd-length array', function () {
    expect(median([1, 3, 2])).toBe(2);
  });
  it('should return the mean of the medians of an even-length array', function () {
    expect(median([4, 1, 2, 3])).toBe(2.5);
  });
  it('should return undefined for an 0-array', function () {
    expect(median([])).toBeUndefined();
  });
  it('should return the correct value for a 1-array', function () {
    expect(median([2])).toBe(2);
  });
  it('should return the correct value for a 2-array', function () {
    expect(median([2, 3])).toBe(2.5);
  });
  it('should not sort the array if it is already sorted', function () {
    expect(median([1, 3, 2], true)).toBe(3);
    expect(median([4, 1, 2, 3], true)).toBe(1.5);
  });
});
