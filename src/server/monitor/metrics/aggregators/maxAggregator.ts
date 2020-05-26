import { SlidingWindowMaximum, SlidingWindowOptions } from '../../lib';
import { SlidingWindowAggregator } from './aggregator';

export class MaxAggregator extends SlidingWindowAggregator {
  private readonly max: SlidingWindowMaximum;
  /**
   * Construct a StatsBasedAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.period period for rolling window
   */
  constructor(options: SlidingWindowOptions) {
    super();
    this.max = new SlidingWindowMaximum(options);
  }

  destroy(): void {
    this.max.destroy();
    super.destroy();
  }

  static get key(): string {
    return 'max';
  }

  static get description(): string {
    return 'Maximum Value';
  }

  get value(): number {
    return this.max.value;
  }

  get duration(): number {
    return this.max.duration;
  }

  get period(): number {
    return this.max.period;
  }

  update(value: number) {
    return this.max.update(value);
  }

  onTick(handler) {
    return this.max.onTick(handler);
  }
}

module.exports = MaxAggregator;
