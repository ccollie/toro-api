import { MovingAverage as MA } from '../../../src/server/stats/moving-average';
import { ManualClock } from '../../../src/server/lib';

describe('MovingAverage', () => {
  const clock = new ManualClock();

  test('moving average with zero time errors', function () {
    expect(() => MA(0)).toThrow();
  });

  test('moving average with negative time errors', function () {
    expect(() => MA(-1)).toThrow();
  });

  test('moving average with one value gets that value', function () {
    const ma = MA(5000);
    ma.update(5);
    expect(ma.value).toEqual(5);
  });

  test('moving average on a constant value returns that value', function () {
    const clock = new ManualClock();
    const ma = MA(5000, clock);
    const now = Date.now();
    clock.set(now);
    ma.update(5);
    clock.set(now + 1000);
    ma.update(5);
    clock.set(now + 2000);
    ma.update(5);
    clock.set(now + 3000);
    ma.update(5);

    expect(ma.value).toBe(5);
  });

  test('moving average works', function () {
    const clock = new ManualClock();
    const ma = MA(50000, clock);

    const now = Date.now();
    clock.set(now);
    ma.update(1);
    clock.set(now + 1000);
    ma.update(2);
    clock.set(now + 2000);
    ma.update(3);
    clock.set(now + 3000);
    ma.update(3);
    clock.set(now + 4000);
    ma.update(10);

    const m = ma.value;
    expect(m).toBeLessThan(1.28);
    expect(m).toBeGreaterThan(1.27);
  });

  test('variance is 0 on one sample', function () {
    const ma = MA(5000);
    ma.update(5);
    expect(ma.variance).toEqual(0);
  });

  test('variance is 0 on samples with same value', function () {
    const clock = new ManualClock();
    const ma = MA(5000, clock);
    const now = Date.now();
    clock.set(now);
    ma.update(3);
    clock.set(now + 1000);
    ma.update(3);
    clock.set(now + 2000);
    ma.update(3);
    clock.set(now + 3000);
    ma.update(3);
    clock.set(now + 4000);
    ma.update(3);
    expect(ma.variance).toEqual(0);
  });

  test('variance works (1)', function () {
    const clock = new ManualClock();
    const ma = MA(5000, clock);
    const now = Date.now();
    clock.set(now);
    ma.update(0);
    clock.set(now + 1000);
    ma.update(1);
    clock.set(now + 2000);
    ma.update(2);
    clock.set(now + 3000);
    ma.update(3);
    clock.set(now + 4000);
    ma.update(4);

    const v = ma.variance;
    expect(v).toBeLessThan(2.54);
    expect(v).toBeGreaterThan(2.53);
  });

  test('variance works (2)', function () {
    const clock = new ManualClock();
    const ma = MA(5000, clock);
    const now = Date.now();
    clock.set(now);
    ma.update(0);
    clock.set(now + 1000);
    ma.update(1);
    clock.set(now + 2000);
    ma.update(1);
    clock.set(now + 3000);
    ma.update(1);
    clock.set(now + 4000);
    ma.update(1);

    const v = ma.variance;
    expect(v).toBeLessThan(0.25);
    expect(v).toBeGreaterThan(0.24);
  });
});
