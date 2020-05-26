import { SlidingWindowStats, SlidingWindowOptions } from '../../lib';
import { SlidingWindowAggregator } from './aggregator';

export class StatsBasedAggregator extends SlidingWindowAggregator {
  protected readonly stats: SlidingWindowStats;
  /**
   * Construct a StatsBasedAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.period period for rolling window
   */
  constructor(options: SlidingWindowOptions) {
    super();
    const { duration, period } = options;
    this.stats = new SlidingWindowStats(duration, period);
  }

  destroy(): void {
    this.stats.destroy();
    super.destroy();
  }

  get duration(): number {
    return this.stats.duration;
  }

  get period(): number {
    return this.stats.period;
  }

  update(value: number) {
    this.stats.update(value);
    return this.value;
  }

  onTick(handler) {
    return this.stats.onTick(handler);
  }
}
