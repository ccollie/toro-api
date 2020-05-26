import {
  CounterBasedMetric,
  CounterBasedMetricOpts,
} from './counterBasedMetric';
import { QueueListener } from '../queues';

export class ConsecutiveFailuresMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options: CounterBasedMetricOpts) {
    super(queueListener, {
      ...options,
      eventName: 'job.failed',
    });

    this.onDestroy(queueListener.on('job.completed', () => this.reset()));
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
