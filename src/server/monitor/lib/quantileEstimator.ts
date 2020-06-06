'use strict';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { DDSketch } from 'sketches-js';

const DefaultMaxBins = 1024;

export class QuantileEstimator {
  private readonly alpha: number;
  private readonly accumulator: DDSketch;
  private readonly slidingWindow: SlidingWindow<DDSketch>;

  constructor(options?: SlidingWindowOptions, alpha = 0.005) {
    this.alpha = alpha; // defaults to a with precision of 1/2 of a percent
    this.accumulator = this._createSketch();
    if (options) {
      this.slidingWindow = new SlidingWindow(options, () =>
        this._createSketch(),
      );
      this.slidingWindow.onTick((data) => this.onTick(data));
    }
  }

  private _createSketch(): DDSketch {
    return new DDSketch({ alpha: this.alpha, maxNumBins: DefaultMaxBins });
  }

  private _clearSketch(sketch: DDSketch): void {
    sketch.bins = {};
    sketch.n = 0;
    sketch.numBins = 0;
  }

  /**
   * Subtract counts in `other` from `sketch`
   * @param {DDSketch} sketch
   * @param {DDSketch} other
   * @private
   */
  private _subtractSketch(sketch: DDSketch, other: DDSketch): void {
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

  destroy(): void {
    if (this.slidingWindow) {
      this.slidingWindow.destroy();
    }
  }

  private onTick({ popped }): void {
    // when we slide, remove old elements
    this._subtractSketch(this.accumulator, popped);
    this._clearSketch(popped);
  }

  update(newVal: number): void {
    if (this.slidingWindow) {
      this.slidingWindow.current.add(newVal);
    }
    this.accumulator.add(newVal);
  }

  quantile(q: number): number {
    return this.accumulator.quantile(q);
  }
}
