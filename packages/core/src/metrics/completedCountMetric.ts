import { QueueCounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';
import { MetricTypes } from './types';

export class CompletedCountMetric extends QueueCounterBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  static get key(): MetricTypes {
    return MetricTypes.Completed;
  }

  static get description(): string {
    return 'Completed Jobs';
  }

  static get unit(): string {
    return 'jobs';
  }
}
