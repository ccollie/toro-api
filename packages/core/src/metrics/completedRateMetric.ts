import { Events } from './constants';
import { RateMetric } from './rateMetric';
import { MetricTypes } from './types';

export class CompletedRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  static get key(): MetricTypes {
    return MetricTypes.CompletedRate;
  }

  static get description(): string {
    return 'Completed Job Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
