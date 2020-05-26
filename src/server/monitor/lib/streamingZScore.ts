import { SlidingWindowStats } from './slidingWindowStats';
import { SlidingWindowOptions } from './slidingWindow';

/*eslint max-len: ["error", { "ignoreUrls": true }]*/

export interface StreamingZScoreOptions {
  threshold?: number;
  influence?: number;
  lag: number;
}

const defaultStreamingZScoreOptions: StreamingZScoreOptions = {
  /** the z-score at which the algorithm signals */
  threshold: 3.5,
  /**
   * the influence of new signals on the mean and standard deviation.
   * Between 0 and 1, where 1 is normal influence, 0.5 is half
   * */
  influence: 0.25,
  /** the lag of the moving window */
  lag: 10,
};

/**
 * A streaming peak detector using smoothed z-scores.
 * {@link https://stackoverflow.com/questions/22583391/peak-signal-detection-in-realtime-timeseries-data/22640362#22640362 }
 * */
export class StreamingZScore {
  private _lastValue?: number;
  signal: number;
  private _stats: any;
  private _zscore: number;
  public readonly influence: number;
  public readonly threshold: number;
  public readonly lag: number;

  /***
   * Construct a StreamingZScore
   * @param window
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the
   * smoothing functions
   * @param {Number} options.period period for rolling window
   * @param {Number} options.threshold standard deviations for signal
   * @param {Number} options.influence between 0 and 1, where 1 is normal
   * influence, 0.5 is half
   * @param {Number} options.lag minimum number of samples
   * @returns StreamingZScore
   */
  constructor(
    window: SlidingWindowOptions,
    options: StreamingZScoreOptions = defaultStreamingZScoreOptions,
  ) {
    const { threshold, influence, lag } = Object.assign(
      {},
      defaultStreamingZScoreOptions,
      options,
    );
    this.threshold = threshold;
    this.influence = influence;
    this.lag = lag || 10;
    this._lastValue = undefined;
    this._zscore = undefined;
    this.signal = 0;
    this._stats = new SlidingWindowStats(window.duration, window.period);
    // todo: we need to update on tick
  }

  destroy() {
    this._stats.destroy();
  }

  clear() {
    this._stats.clear();
  }

  get value(): number {
    return this._zscore;
  }

  get count(): number {
    return this._stats.count;
  }

  get duration(): number {
    return this._stats.duration;
  }

  get period(): number {
    return this._stats.period;
  }

  onTick(handler) {
    return this._stats.onTick(handler);
  }

  /**
   * Calculate the smoothed zscore
   * */
  update(value: number): number {
    const stats = this._stats;
    this._lastValue = value;
    this.signal = 0;
    if (stats.count < this.lag) {
      stats.update(value);
    } else {
      const mean = stats.mean;
      const stdDev = stats.populationStdev;
      const delta = value - mean;
      this._zscore = stdDev === 0 ? delta / stdDev : 0;
      if (Math.abs(delta) > this.threshold * stdDev) {
        const nextValue =
          value * this.influence + (1.0 - this.influence) * this._lastValue;
        stats.update(nextValue);
        this.signal = value > mean ? 1 : -1;
      } else {
        stats.update(value);
      }

      this._lastValue = value;
    }

    return this._zscore;
  }
}
