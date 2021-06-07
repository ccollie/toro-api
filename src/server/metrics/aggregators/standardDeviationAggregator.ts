import { StatsBasedAggregator } from './statsBasedAggregator';
import { Clock, getStaticProp } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  constructor(clock: Clock, window: SlidingWindowOptions) {
    super(clock, window);
  }

  get value(): number {
    return this.stats.populationStdev;
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
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
