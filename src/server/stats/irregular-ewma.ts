import { Clock } from '../lib';

/**
 * Compute the exponential weighted moving average of a series of values.
 * The time at which you insert the value into `Ewma` is used to compute a
 * weight (recent points are weighted higher).
 * The parameter for defining the convergence speed (like most decay process) is
 * the half-life.
 *
 * e.g. with a half-life of 10 unit, if you insert 100 at t=0 and 200 at t=10
 *      the ewma will be equal to (200 - 100)/2 = 150 (half of the distance
 *      between the new and the old value)
 *
 * @param {Number} halfLifeMs parameter representing the speed of convergence
 * @param {Number} initialValue initial value
 * @param {Object} clock clock object used to read time
 *
 * @returns {IrregularEwma} the object computing the ewma average
 */
export class IrregularEwma {
  private stamp: number = 0;
  private value: number | undefined;
  private readonly decay: number;

  constructor(readonly clock: Clock, halfLifeMs: number, value?: number) {
    if (isNaN(halfLifeMs) || halfLifeMs < 1)
      throw new RangeError('halfLifeMs must be a number > 0');
    this.value = value;
    this.decay = halfLifeMs;
    this.stamp = typeof value === 'number' ? this.clock.getTime() : 0;
  }

  update(x: number): this {
    if (Number.isNaN(x)) throw RangeError('x can not be NaN');

    const now = this.clock.getTime();
    const elapsed = Math.max(0, now - this.stamp);
    this.stamp = now;

    const instantAverage = elapsed == 0 ? 1 : x / elapsed;

    // This seemingly magic equation is derived from the fact that we are
    // defining a half life for each value. A half life is the amount of time
    // that it takes for a value V to decay to .5V or V/2. Elapsed is the time
    // delta between this value being reported and the previous value being
    // reported. Given the half life, and the amount of time since the last
    // reported value, this equation determines how much the new value should
    // be represented in the ewma.
    // For a detailed proof read:
    // A Framework for the Analysis of Unevenly Spaced Time Series Data
    // Eckner, 2014
    const w = Math.pow(2, -elapsed / this.decay);
    this.value = w * this.value + (1.0 - w) * instantAverage;
    return this;
  }

  get rate(): number {
    return this.value ?? 0;
  }

  reset(x?: number): this {
    this.value = x;
    this.stamp = this.clock.getTime();
    return this;
  }
}
