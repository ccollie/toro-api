import { RateMetric } from './rateMetric';
import { Events } from './constants';

export class JobRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): string {
    return 'job_rate';
  }

  static get description(): string {
    return 'Job Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
