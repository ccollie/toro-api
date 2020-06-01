import { Events } from './constants';
import { RateMetric } from './rateMetric';

export class CompletedRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  static get key(): string {
    return 'completed_rate';
  }

  static get description(): string {
    return 'Completed Job Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
