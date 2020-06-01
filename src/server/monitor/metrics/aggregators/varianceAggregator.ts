import { StatsBasedAggregator } from './statsBasedAggregator';

export class VarianceAggregator extends StatsBasedAggregator {
  get value(): number {
    return this.stats.populationVariance;
  }

  static get key(): string {
    return 'variance';
  }

  static get description(): string {
    return 'Variance';
  }
}
