/*
The MIT License (MIT)
Copyright (c) 2014 Tristan Slominski
Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NON-INFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

import { SECONDS, MINUTES } from './units';

const ONE_MINUTE = MINUTES;
const DEFAULT_TICK_INTERVAL = 5 * SECONDS;

export class ExponentiallyMovingWeightedAverage {
  /**
   * The current average.
   *
   * @private
   * @type {number}
   */
  private avg = -1.0;
  public readonly alpha: number;
  public readonly tickInterval: number;
  public readonly timePeriod: number;
  private count: number;

  constructor(timePeriod = ONE_MINUTE, tickInterval = DEFAULT_TICK_INTERVAL) {
    this.timePeriod = timePeriod;
    this.tickInterval = tickInterval;
    this.alpha = 1 - Math.exp((-1 * this.tickInterval) / this.timePeriod);
    this.count = 0;
  }

  update(n = 1): this {
    this.count += n;
    return this;
  }

  get instantRate(): number {
    return this.count / this.tickInterval;
  }

  /**
   * Updates the current average by multiplying the alpha value with the difference
   * of the last average and the current average.
   *
   * Averages are calculated by dividing the sum through the sampling interval.
   *
   * If the alpha value is high the last average has more weight and vice versa.
   *
   * @returns {this}
   */
  tick(): this {
    const instantRate = this.instantRate;
    this.count = 0;
    if (this.avg === -1.0) {
      this.avg = instantRate;
    } else {
      this.avg += this.alpha * (instantRate - this.avg);
    }
    return this;
  }

  rate(timeUnit: number = SECONDS): number {
    return this.avg === -1.0 ? 0 : this.avg * timeUnit;
  }

  reset(): this {
    this.avg = -1.0;
    this.count = 0;
    return this;
  }
}
