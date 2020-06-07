import { StreamingStats } from './streamingStats';
import { SlidingWindowOptions } from './slidingWindow';
import Emittery from 'emittery';

/*eslint max-len: ["error", { "ignoreUrls": true }]*/

export interface StreamingZScoreOptions {
  threshold?: number;
  influence?: number;
  lag?: number;
}

export type SignalChangedEvent = {
  value: number;
  zscore: number;
  signal: number;
};

export type SignalChangedHandler = (eventData: SignalChangedEvent) => void;

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
  private lastValue?: number;
  public signal: number;
  private readonly _stats: StreamingStats;
  private zscore: number;
  public readonly influence: number;
  public readonly threshold: number;
  public readonly lag: number;
  private readonly emitter: Emittery = new Emittery();

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
    window?: SlidingWindowOptions,
    options: StreamingZScoreOptions = defaultStreamingZScoreOptions,
  ) {
    const { threshold, influence, lag } = Object.assign(
      {},
      defaultStreamingZScoreOptions,
      options,
    );
    this.threshold = threshold;
    this.influence = influence;
    this.lag = lag;
    this.lastValue = undefined;
    this.zscore = undefined;
    this.signal = 0;
    this._stats = new StreamingStats(window);
    // todo: we need to update on tick
  }

  destroy(): void {
    this._stats.destroy();
  }

  clear(): void {
    this._stats.clear();
  }

  get value(): number {
    return this.zscore;
  }

  get count(): number {
    return this._stats.count;
  }

  onSignalChange(handler: SignalChangedHandler): Emittery.UnsubscribeFn {
    return this.emitter.on('signal', handler);
  }

  /**
   * Calculate the smoothed zscore
   * */
  update(value: number): number {
    const stats = this._stats;
    const oldSignal = this.signal;
    this.signal = 0;

    this.lastValue = value;
    if (stats.count < this.lag) {
      stats.update(value);
    } else {
      const mean = stats.mean;
      const stdDev = stats.populationStdev;
      const delta = value - mean;
      this.zscore = stdDev === 0 ? 0 : delta / stdDev;

      let nextValue = value;
      if (Math.abs(delta) > this.threshold * stdDev) {
        nextValue =
          value * this.influence + (1.0 - this.influence) * this.lastValue;
        this.signal = value > mean ? 1 : -1;
      }

      stats.update(nextValue);
      this.lastValue = value;

      if (this.signal !== oldSignal) {
        const event: SignalChangedEvent = {
          value,
          zscore: this.zscore,
          signal: this.signal,
        };
        this.emitter.emit('signal', event).catch((err) => console.error(err));
      }
    }

    return this.zscore;
  }
}
