import { StatsBasedAggregator } from './statsBasedAggregator';

export class StandardDeviationAggregator extends StatsBasedAggregator {
  get value() {
    return this.stats.populationStdev;
  }

  static get key() {
    return 'std_dev';
  }

  static get description() {
    return 'Std Deviation';
  }
}
