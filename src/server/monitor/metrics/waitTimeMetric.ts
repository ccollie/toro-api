import { BaseMetric, MetricOptions } from './baseMetric';
import { QueueListener } from '../queues';

export class WaitTimeMetric extends BaseMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, options);
    this.subscribe('job.finished', ({ wait }) => this.update(wait));
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
