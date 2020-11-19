import { CounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';

export class CompletedCountMetric extends CounterBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  static get key(): string {
    return 'completed';
  }

  static get description(): string {
    return 'Completed Jobs';
  }

  static get unit(): string {
    return 'jobs';
  }
}
