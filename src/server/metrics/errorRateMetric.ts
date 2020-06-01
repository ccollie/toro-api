import { RateMetric } from './rateMetric';
import { Events } from './constants';

export class ErrorRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.FAILED];
  }

  static get key(): string {
    return 'error_rate';
  }

  static get description(): string {
    return 'Error Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
