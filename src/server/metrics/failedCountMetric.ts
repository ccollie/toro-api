import { CounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';
import { MetricTypes } from '../../types';

export class FailedCountMetric extends CounterBasedMetric {
  get validEvents(): string[] {
    return [Events.FAILED];
  }

  static get key(): MetricTypes {
    return MetricTypes.Failures;
  }

  static get description(): string {
    return 'Failed Jobs';
  }

  static get unit(): string {
    return 'jobs';
  }
}
