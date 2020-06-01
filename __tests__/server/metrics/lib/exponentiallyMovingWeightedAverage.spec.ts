'use strict';
import { ExponentiallyMovingWeightedAverage, SECONDS } from '../../common';

describe('ExponentiallyMovingWeightedAverage', function () {
  it('decay over several updates and ticks', function () {
    const ewma = new ExponentiallyMovingWeightedAverage();

    ewma.update(5);
    ewma.tick();

    expect(ewma.rate(SECONDS).toFixed(3)).toBe('0.080');

    ewma.update(5);
    ewma.update(5);
    ewma.tick();

    expect(ewma.rate(SECONDS).toFixed(3)).toBe('0.233');

    ewma.update(15);
    ewma.tick();

    expect(ewma.rate(SECONDS).toFixed(3)).toBe('0.455');

    for (let i = 0; i < 200; i++) {
      ewma.update(15);
      ewma.tick();
    }

    expect(ewma.rate(SECONDS).toFixed(3)).toBe('3.000');
  });
});
