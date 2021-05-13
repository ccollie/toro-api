import { QueueCounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';
import { MetricTypes } from '../../types';

/**
 * Tracks the number of finished jobs (i.e. Completed or Failed)
 */
export class FinishedCountMetric extends QueueCounterBasedMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): MetricTypes {
    return MetricTypes.Finished;
  }

  static get unit(): string {
    return 'jobs';
  }

  static get description(): string {
    return 'Finished Jobs';
  }
}
