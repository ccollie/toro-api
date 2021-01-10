import { DDSketch } from 'sketches-js';
import { clearDDSketch } from './utils';

const DefaultMaxBins = 1024;

// see https://www.datadoghq.com/blog/engineering/computing-accurate-percentiles-with-ddsketch/
export class QuantileEstimator {
  readonly alpha: number;
  private readonly maxBins: number;
  protected readonly accumulator: DDSketch;

  constructor(alpha = 0.005, maxBins = DefaultMaxBins) {
    this.alpha = alpha; // defaults to a with precision of 1/2 of a percent
    this.maxBins = maxBins;
    this.accumulator = this._createSketch();
  }

  get count(): number {
    return this.accumulator.n;
  }

  protected _createSketch(): DDSketch {
    return new DDSketch({ alpha: this.alpha, maxNumBins: this.maxBins });
  }

  /**
   * Subtract counts in `other` from `sketch`
   * @param {DDSketch} sketch
   * @param {DDSketch} other
   * @private
   */
  subtractSketch(sketch: DDSketch, other: DDSketch): void {
    if (other && sketch) {
      if (sketch.alpha !== other.alpha) {
        throw new Error(
          'Alpha values must be the same to subtract two sketches',
        );
      }

      Object.keys(other.bins).forEach((i) => {
        if (sketch.bins[i]) {
          const count = other.bins[i];
          sketch.bins[i] -= count;
          sketch.n = sketch.n - count;

          if (sketch.n < 0) {
            sketch.n = 0;
          }

          if (sketch.bins[i] <= 0) {
            delete sketch.bins[i];
          }
        }
      });
    }
  }

  clear(): this {
    clearDDSketch(this.accumulator);
    return this;
  }

  subtract(other: QuantileEstimator): this {
    this.subtractSketch(this.accumulator, other.accumulator);
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  update(newVal: number): this {
    this.accumulator.add(newVal);
    return this;
  }

  quantile(q: number): number {
    return this.accumulator.quantile(q);
  }
}
