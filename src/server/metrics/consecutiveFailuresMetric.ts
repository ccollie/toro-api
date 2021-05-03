import { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { CounterBasedMetric } from './counterBasedMetric';
import { MetricTypes } from '../../types';

export class ConsecutiveFailuresMetric extends CounterBasedMetric {
  handleEvent(event?: JobFinishedEventData): void {
    if (event.success) {
      this.reset();
    } else {
      this.incr();
    }
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): MetricTypes {
    return MetricTypes.ConsecutiveFailures;
  }

  static get description(): string {
    return 'Consecutive failures';
  }

  static get unit(): string {
    return 'jobs';
  }
}
