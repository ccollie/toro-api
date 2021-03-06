import { QueueCounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';
import { MetricTypes } from '@src/types';

export class FailedCountMetric extends QueueCounterBasedMetric {
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
