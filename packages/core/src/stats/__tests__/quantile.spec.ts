import { quantile } from '../quantile';

describe('quantile', () => {
  // eslint-disable-next-line max-len
  it('should throw an error if the second argument is not a numeric value in the interval [0,1]', () => {
    const values = [5, -5, -0.1, 1.001];

    for (let i = 0; i < values.length; i++) {
      expect(() => quantile([], values[i], { sorted: true })).toThrow(/invalid input argument/);
    }
  });

  it('should compute a quantile', function test() {
    let data;

    // Even number of elements...

    // 1st decile: 2, 9th decile: 7.5
    data = [6, 4, 3, 3, 5, 7, 4, 7, 8, 1];

    expect(quantile(data, 0.1)).toEqual(2);

    expect(quantile(data, 0.9)).toEqual(7.5);

    expect(quantile(data, 0)).toEqual(1);

    expect(quantile(data, 1)).toEqual(8);

    data.sort((a, b) => a - b);

    expect(quantile(data, 0.5, { sorted: true })).toEqual(4.5);

    // Odd number of elements...
    data = [6, 4, 3, 3, 5, 7, 7, 8, 1];

    expect(quantile(data, 0.5)).toEqual(5);
  });
});
