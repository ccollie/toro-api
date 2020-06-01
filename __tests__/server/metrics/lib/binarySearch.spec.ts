import { binarySearch } from '../../../../src/server/metrics/lib/binarySearch';

describe('binarySearch', () => {

  test('it can search', () => {
    const a2 = [-5, -2, 0, 0, 1, 3, 4];

    expect(binarySearch(a2, 1)).toBe(4);
    expect(binarySearch(a2, -1)).toBe(-3);
  });
})
