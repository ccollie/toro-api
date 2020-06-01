import { BaseMetric } from './baseMetric';
import { JobFinishedEventData } from '../queues';
import { Events } from './constants';

export class LatencyMetric extends BaseMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.latency);
  }

  static get key(): string {
    return 'latency';
  }

  static get description(): string {
    return 'Job Latency';
  }

  static get unit(): string {
    return 'ms';
  }
}
