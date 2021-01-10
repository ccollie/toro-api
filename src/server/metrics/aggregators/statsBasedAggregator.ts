import { StreamingStats } from '../../stats';
import { BaseAggregator } from './aggregator';
import { Clock } from '../../lib';
import { SlidingWindowOptions } from '../../../types';

export class StatsBasedAggregator extends BaseAggregator {
  protected readonly stats: StreamingStats;
  private readonly options: SlidingWindowOptions;

  /**
   * Construct a StatsBasedAggregator
   * @param clock
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.interval interval for rolling window
   */
  constructor(clock: Clock, options: SlidingWindowOptions) {
    super(clock);
    this.stats = new StreamingStats(clock, options.duration);
  }

  get count(): number {
    return this.stats.count;
  }

  destroy(): void {
    this.stats.destroy();
    super.destroy();
  }

  update(value: number): number {
    this.stats.update(value);
    return this.value;
  }

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    return {
      type,
      options: {
        ...this.options,
      },
    };
  }
}
