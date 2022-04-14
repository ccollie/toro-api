import { QueueBasedMetric } from './baseMetric';
import type { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { MetricTypes } from '../types';

export class ResponseTimeMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.responseTime, event.ts);
  }

  static get key(): MetricTypes {
    return MetricTypes.Latency;
  }

  static get description(): string {
    return 'Total time spent in the queue';
  }

  static get unit(): string {
    return 'ms';
  }
}
