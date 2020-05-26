import { SlidingWindowSum, SlidingWindowOptions } from '../../lib';
import { SlidingWindowAggregator } from './aggregator';

/*
An aggregator to return a sum over a sliding window
 */
export class SumAggregator extends SlidingWindowAggregator {
  private readonly sum: any;
  /**
   * Construct a SumAggregator
   */
  constructor(window: SlidingWindowOptions) {
    super();
    this.sum = new SlidingWindowSum(window);
  }

  destroy(): void {
    this.sum.destroy();
    super.destroy();
  }

  static get key(): string {
    return 'sum';
  }

  static get description(): string {
    return 'Sum Of Values';
  }

  get value(): number {
    return this.sum.value;
  }

  get duration(): number {
    return this.sum.duration;
  }

  get period(): number {
    return this.sum.period;
  }

  update(value) {
    return this.sum.update(value);
  }

  onTick(handler) {
    return this.sum.onTick(handler);
  }
}
