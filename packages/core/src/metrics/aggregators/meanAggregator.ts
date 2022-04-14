import { StatsBasedAggregator } from './statsBasedAggregator';
import { AggregatorTypes, SlidingWindowOptions } from '../../types';
import { getMetricTypeName } from './utils';

/***
 * An aggregator returning the mean of a stream of values
 */
export class MeanAggregator extends StatsBasedAggregator {
  constructor(window?: SlidingWindowOptions) {
    super(window, 'mean');
  }

  getDescription(metric: unknown, short = false): string {
    const type = getMetricTypeName(metric);
    if (short) {
      return `avg(${type})`;
    }
    return `${type} average`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Mean;
  }

  static get description(): string {
    return 'Average';
  }
}
