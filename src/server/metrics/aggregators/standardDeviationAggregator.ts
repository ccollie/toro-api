import { StatsBasedAggregator } from './statsBasedAggregator';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  constructor(window: SlidingWindowOptions) {
    super(window, 'standardDeviation');
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = BaseMetric.getTypeName(metric);
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
