import { BaseMetric } from './baseMetric';
import { QueueListener } from '../queues';

export class WaitTimeMetric extends BaseMetric {
  constructor(queueListener: QueueListener) {
    super();
    this.onDestroy(
      queueListener.on('job.finished', ({ wait }) => this.update(wait)),
    );
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
