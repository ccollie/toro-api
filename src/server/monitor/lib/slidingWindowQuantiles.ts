'use strict';
import { SlidingWindow, SlidingWindowOptions } from './slidingWindow';
import { DDSketch } from 'sketches-js';
import { EventEmitter } from 'events';

export class SlidingWindowQuantile extends EventEmitter {
  private readonly alpha: number;
  private readonly accumulator: DDSketch;
  private readonly slidingWindow: SlidingWindow<DDSketch>;

  constructor(options?: SlidingWindowOptions, alpha = 0.005) {
    super();

    this.alpha = alpha; // defaults to a with precision of 1/2 of a percent
    this.slidingWindow = new SlidingWindow(options, () => this._createSketch());

    this.accumulator = this._createSketch();
    this.slidingWindow.onTick((data) => this.onTick(data));
  }

  private _createSketch(): DDSketch {
    return new DDSketch({ alpha: this.alpha });
  }

  private static _clearSketch(sketch): void {
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
  _subtractSketch(sketch: DDSketch, other: DDSketch) {
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

  destroy() {
    this.slidingWindow.destroy();
  }

  get value(): number {
    return this.accumulator;
  }

  /** Return the length of the sliding window */
  get duration(): number {
    return this.slidingWindow.duration;
  }

  get period(): number {
    return this.slidingWindow.period;
  }

  onTick({ popped }) {
    // when we slide, remove old elements
    this._subtractSketch(this.accumulator, popped);
    SlidingWindowQuantile._clearSketch(popped);
  }

  update(newVal: number) {
    this.slidingWindow.current.add(newVal);
    this.accumulator.add(newVal);
    return this.accumulator;
  }

  quantile(q: number): number {
    return this.accumulator.quantile(q);
  }
}
