import { CounterBasedMetric } from './counterBasedMetric';
import { Events } from './constants';

/**
 * Tracks the number of finished jobs (i.e. Completed or Failed)
 */
export class FinishedCountMetric extends CounterBasedMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): string {
    return 'finished_count';
  }

  static get unit(): string {
    return 'jobs';
  }

  static get description(): string {
    return 'Finished Jobs';
  }
}
