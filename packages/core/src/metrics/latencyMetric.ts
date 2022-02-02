import { QueueBasedMetric } from './baseMetric';
import type { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { MetricTypes } from './types';

export class LatencyMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.latency, event.ts);
  }

  static get key(): MetricTypes {
    return MetricTypes.Latency;
  }

  static get description(): string {
    return 'Job Latency';
  }

  static get unit(): string {
    return 'ms';
  }
}
