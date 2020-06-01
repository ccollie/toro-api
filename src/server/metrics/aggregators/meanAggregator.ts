import { StatsBasedAggregator } from './statsBasedAggregator';
import { Clock, getStaticProp } from '../../lib';
import { SlidingWindowOptions } from '../../../types';
import { BaseMetric } from '../baseMetric';

/***
 * An aggregator returning the mean of a stream of values
 */
export class MeanAggregator extends StatsBasedAggregator {
  constructor(clock: Clock, window?: SlidingWindowOptions) {
    super(clock, window);
  }

  get value(): number {
    return this.stats.mean;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return `avg(${type})`;
    }
    return `${type} avg`;
  }

  static get key(): string {
    return 'avg';
  }

  static get description(): string {
    return 'Average';
  }
}
