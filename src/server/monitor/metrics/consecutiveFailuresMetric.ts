import { CounterBasedMetric } from './counterBasedMetric';
import { QueueListener } from '../queues';
import { MetricOptions } from './baseMetric';

export class ConsecutiveFailuresMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, 'job.failed', options);
    this.subscribe('job.completed', () => this.reset());
  }

  static get key(): string {
    return 'consecutive_failures';
  }

  static get description(): string {
    return 'Consecutive failures';
  }

  static get unit(): string {
    return 'failures';
  }
}
