import { StreamingStats, SlidingWindowOptions } from '../lib';
import { BaseAggregator } from './aggregator';

export class StatsBasedAggregator extends BaseAggregator {
  protected readonly stats: StreamingStats;
  /**
   * Construct a StatsBasedAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.period period for rolling window
   */
  constructor(options: SlidingWindowOptions) {
    super();
    this.stats = new StreamingStats(options);
  }

  destroy(): void {
    this.stats.destroy();
    super.destroy();
  }

  update(value: number): number {
    this.stats.update(value);
    return this.value;
  }
}
