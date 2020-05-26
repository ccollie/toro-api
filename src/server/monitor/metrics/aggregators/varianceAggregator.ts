import { StatsBasedAggregator } from './statsBasedAggregator';

export class VarianceAggregator extends StatsBasedAggregator {
  get value() {
    return this.stats.populationVariance;
  }

  static get key() {
    return 'variance';
  }

  static get description() {
    return 'Variance';
  }
}
