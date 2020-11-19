import { StatsBasedAggregator } from './statsBasedAggregator';
import { Clock, getStaticProp } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { SlidingWindowOptions } from '../../../types';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  constructor() {
    super(null, null);
  }

  get value(): number {
    return this.stats.populationStdev;
  }

  static get key(): string {
    return 'std_dev';
  }

  static get description(): string {
    return 'Std Deviation';
  }
}

export class SlidingWindowStandardDeviationAggregator extends StatsBasedAggregator {
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

  static get key(): string {
    return 'std_dev';
  }

  static get description(): string {
    return 'Sliding Window Std Deviation';
  }
}
