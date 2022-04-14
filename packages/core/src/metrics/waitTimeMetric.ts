import { QueueBasedMetric } from './baseMetric';
import type { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { MetricTypes } from '../types';

export class WaitTimeMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.wait, event.ts);
  }

  static get key(): MetricTypes {
    return MetricTypes.WaitTime;
  }

  static get description(): string {
    return 'Job Wait Time';
  }

  static get unit(): string {
    return 'ms';
  }
}
