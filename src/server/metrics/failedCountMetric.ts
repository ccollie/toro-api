import { CounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';

export class FailedCountMetric extends CounterBasedMetric {
  get validEvents(): string[] {
    return [Events.FAILED];
  }

  static get key(): string {
    return 'failure_count';
  }

  static get description(): string {
    return 'Failed Jobs';
  }

  static get unit(): string {
    return 'jobs';
  }
}
