import { MovingAverage as MA } from '@src/server/stats/moving-average';

describe('MovingAverage', () => {
  test('moving average with zero time errors', function () {
    expect(() => MA(0)).toThrow();
  });

  test('moving average with negative time errors', function () {
    expect(() => MA(-1)).toThrow();
  });

  test('moving average with one value gets that value', function () {
    const ma = MA(5000);
    ma.update(Date.now(), 5);
    expect(ma.value).toEqual(5);
  });

  test('moving average on a constant value returns that value', function () {
    const ma = MA(5000);
    const now = Date.now();
    ma.update(now, 5);
    ma.update(now + 1000, 5);
    ma.update(now + 2000, 5);
    ma.update(now + 3000, 5);

    expect(ma.value).toBe(5);
  });

  test('moving average works', function () {
    const ma = MA(50000);

    const now = Date.now();
    ma.update(now, 1);
    ma.update(now + 1000, 2);
    ma.update(now + 2000, 3);
    ma.update(now + 3000, 3);
    ma.update(now + 4000, 10);

    const m = ma.value;
    expect(m).toBeLessThan(1.28);
    expect(m).toBeGreaterThan(1.27);
  });

  test('variance is 0 on one sample', function () {
    const ma = MA(5000);
    ma.update(Date.now(), 5);
    expect(ma.variance).toEqual(0);
  });

  test('variance is 0 on samples with same value', function () {
    const ma = MA(5000);
    const now = Date.now();
    ma.update(now, 3);
    ma.update(now + 1000, 3);
    ma.update(now + 2000, 3);
    ma.update(now + 3000, 3);
    ma.update(now + 4000, 3);
    expect(ma.variance).toEqual(0);
  });

  test('variance works (1)', function () {
    const ma = MA(5000);
    const now = Date.now();
    ma.update(now, 0);
    ma.update(now + 1000, 1);
    ma.update(now + 2000, 2);
    ma.update(now + 3000, 3);
    ma.update(now + 4000, 4);

    const v = ma.variance;
    expect(v).toBeLessThan(2.54);
    expect(v).toBeGreaterThan(2.53);
  });

  test('variance works (2)', function () {
    const ma = MA(5000);

    const now = Date.now();
    ma.update(now, 0);
    ma.update(now + 1000, 1);
    ma.update(now + 2000, 1);
    ma.update(now + 3000, 1);
    ma.update(now + 4000, 1);

    const v = ma.variance;
    expect(v).toBeLessThan(0.25);
    expect(v).toBeGreaterThan(0.24);
  });
});
