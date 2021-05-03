import { RateMetric } from './rateMetric';
import { Events } from './constants';
import { MetricTypes } from '../../types';

export class ErrorRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.FAILED];
  }

  static get key(): MetricTypes {
    return MetricTypes.ErrorRate;
  }

  static get description(): string {
    return 'Error Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
