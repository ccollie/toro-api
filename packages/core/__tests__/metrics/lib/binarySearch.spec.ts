import { binarySearch } from '@src/../../../../packages/core/src/lib/binary-search';

describe('binarySearch', () => {
  test('it can search', () => {
    const a2 = [-5, -2, 0, 0, 1, 3, 4];

    expect(binarySearch(a2, 1)).toBe(4);
    expect(binarySearch(a2, -1)).toBe(-3);
  });
});
