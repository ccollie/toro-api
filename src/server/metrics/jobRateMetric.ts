import { RateMetric } from './rateMetric';
import { Events } from './constants';
import { MetricTypes } from '../../types';

export class JobRateMetric extends RateMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): MetricTypes {
    return MetricTypes.JobRate;
  }

  static get description(): string {
    return 'Job Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
