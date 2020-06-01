import { BaseMetric } from './baseMetric';
import { JobFinishedEventData } from '../queues';
import { Events } from './constants';

export class WaitTimeMetric extends BaseMetric {
  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.wait);
  }

  static get key(): string {
    return 'wait_time';
  }

  static get description(): string {
    return 'Job Wait Time';
  }

  static get unit(): string {
    return 'ms';
  }
}
