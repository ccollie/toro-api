import { StatsBasedAggregator } from './statsBasedAggregator';
import { AggregatorTypes, SlidingWindowOptions } from '../../types';
import { Metric } from '../metric';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  constructor(window: SlidingWindowOptions) {
    super(window, 'standardDeviation');
  }

  getDescription(metric: Metric, short = false): string {
    const type = metric.name.name;
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
