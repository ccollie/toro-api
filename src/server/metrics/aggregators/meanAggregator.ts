import { StatsBasedAggregator } from './statsBasedAggregator';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { BaseMetric } from '../baseMetric';

/***
 * An aggregator returning the mean of a stream of values
 */
export class MeanAggregator extends StatsBasedAggregator {
  constructor(window?: SlidingWindowOptions) {
    super(window, 'mean');
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = BaseMetric.getTypeName(metric);
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
