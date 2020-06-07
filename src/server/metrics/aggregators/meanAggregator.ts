import { StatsBasedAggregator } from './statsBasedAggregator';

export class MeanAggregator extends StatsBasedAggregator {
  get value(): number {
    return this.stats.mean;
  }

  static get key(): string {
    return 'avg';
  }

  static get description(): string {
    return 'Average';
  }
}
