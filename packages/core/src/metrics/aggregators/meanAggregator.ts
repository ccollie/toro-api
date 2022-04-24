import { StatsBasedAggregator } from './statsBasedAggregator';
import { AggregatorTypes, SlidingWindowOptions } from '../../types';
import { Metric } from '../metric';

/***
 * An aggregator returning the mean of a stream of values
 */
export class MeanAggregator extends StatsBasedAggregator {
  constructor(window?: SlidingWindowOptions) {
    super(window, 'mean');
  }

  getDescription(metric: Metric, short = false): string {
    const type = metric.name.name;
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
