import { SlidingWindowAggregator } from './aggregator';
import { SlidingWindowMinimum, SlidingWindowOptions } from '../../lib';

export class MinAggregator extends SlidingWindowAggregator {
  private readonly min: SlidingWindowMinimum;
  /**
   * Construct a MinAggregator
   * @param {Object} options options
   * @param {Number} options.duration rolling statistical window for the stats functions
   * @param {Number} options.period period for rolling window
   */
  constructor(options: SlidingWindowOptions) {
    super();
    this.min = new SlidingWindowMinimum(options);
  }

  destroy(): void {
    this.min.destroy();
    super.destroy();
  }

  static get key(): string {
    return 'min';
  }

  static get description(): string {
    return 'Minimum';
  }

  get value(): number {
    return this.min.value;
  }

  get duration(): number {
    return this.min.duration;
  }

  get period(): number {
    return this.min.period;
  }

  update(value) {
    return this.min.update(value);
  }

  onTick(handler) {
    return this.min.onTick(handler);
  }
}
