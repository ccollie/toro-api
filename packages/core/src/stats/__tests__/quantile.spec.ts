import { quantile } from '../quantile';

describe('quantile', () => {
  it('should throw an error if the second argument is not a numeric value in the interval [0,1]', () => {
    const values = [
      '5',
      5,
      -0.1,
      true,
      undefined,
      null,
      NaN,
      [],
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      function () {},
      {},
    ];

    for (let i = 0; i < values.length; i++) {
      expect(badValue(values[i])).toThrow(TypeError);
    }

    function badValue(value) {
      return function () {
        quantile([], value, { sorted: true });
      };
    }
  });

  it('should throw an error if provided a non-object for the third argument', function test() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const values = ['5', 5, [], undefined, null, NaN, function () {}, true];

    for (let i = 0; i < values.length; i++) {
      expect(badValue(values[i])).toThrow(TypeError);
    }

    function badValue(value) {
      return function () {
        quantile([], 0.25, value);
      };
    }
  });

  it('should throw an error if provided a non-boolean sorted flag', function test() {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const values = ['5', 5, [], undefined, null, NaN, function () {}, {}];

    for (let i = 0; i < values.length; i++) {
      expect(badValue(values[i])).toThrow(TypeError);
    }

    function badValue(value) {
      return function () {
        quantile([], 0.25, { sorted: value });
      };
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
