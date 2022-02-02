import type { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { QueueCounterBasedMetric } from './counterBasedMetric';
import { MetricTypes } from './types';

export class ConsecutiveFailuresMetric extends QueueCounterBasedMetric {
  handleEvent(event: JobFinishedEventData): void {
    if (event.success) {
      this.reset(event.ts);
    } else {
      this.incr(1, event.ts);
    }
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  static get key(): MetricTypes {
    return MetricTypes.ConsecutiveFailures;
  }

  static get description(): string {
    return 'Consecutive Failures';
  }

  static get unit(): string {
    return 'jobs';
  }
}
