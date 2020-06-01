import { StatsBasedAggregator } from './statsBasedAggregator';

export class StandardDeviationAggregator extends StatsBasedAggregator {
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
