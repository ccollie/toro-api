import { StatsBasedAggregator } from './statsBasedAggregator';
import { AggregatorTypes, SlidingWindowOptions } from '../../types';
import { getMetricTypeName } from './utils';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  constructor(window: SlidingWindowOptions) {
    super(window, 'standardDeviation');
  }

  getDescription(metric: unknown, short = false): string {
    const type = getMetricTypeName(metric);
    if (short) {
      return `std_dev(${type})`;
    }
    return `${type} std deviation`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.StdDev;
  }

  static get description(): string {
    return 'Std Deviation';
  }
}
