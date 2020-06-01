import OnlineNormalEstimator from './onlineNormalEstimator';
import { Clock } from '../../lib';

export enum PeakSignal {
  NONE,
  ABOVE,
  BELOW = -1,
}

/**
 * "Smoothed zero-score algorithm" shamelessly copied from
 *  https://stackoverflow.com/a/22640362/6029703
 *  Uses a rolling mean and a rolling deviation (separate) to identify peaks in a vector
 *
 * @param lag - The lag time (in ms) of the moving window how much your data will be smoothed
 * and how adaptive the algorithm is to changes in the long-term average of the data.
 * @param threshold - The z-score at which the algorithm signals (i.e. how many standard deviations
 * away from the moving mean a peak (or signal) is)
 * @param influence - The influence (between 0 and 1) of new signals on the mean and standard
 * deviation (how much a peak (or signal) should affect other values near it)
 * @return - The signal
 */
export class RealTimePeakDetector {
  public readonly lag: number;
  public readonly threshold: number;
  public readonly influence: number;
  public signal = 0;
  private filteredY: number;
  private readonly clock: Clock;
  private readonly lagEnd: number;
  private readonly stats: OnlineNormalEstimator;

  constructor(clock: Clock, lag: number, threshold: number, influence: number) {
    this.clock = clock;
    this.lag = lag;
    this.threshold = threshold;
    this.influence = influence;
    this.filteredY = undefined;
    this.lagEnd = clock.getTime() + this.lag;
    this.stats = new OnlineNormalEstimator();
  }

  get isInLagPeriod(): boolean {
    return this.clock.getTime() < this.lagEnd;
  }

  update(value: number): number {
    const { threshold, influence, stats } = this;

    this.signal = 0;

    if (this.isInLagPeriod) {
      stats.add(value);
      return 0;
    }

    const mean = stats.mean;
    const std = stats.standardDeviation;

    const oldValue = this.filteredY;

    // todo: skip signaling if we go > this.lag since the last update

    if (stats.count && Math.abs(value - mean) > threshold * std) {
      this.signal = value > mean ? 1 : -1;
      this.filteredY = influence * value + (1 - influence) * this.filteredY;
    } else {
      this.filteredY = value;
    }

    stats.replace(oldValue, this.filteredY);

    return this.signal;
  }
}
