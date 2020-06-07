import { CounterBasedMetric } from './counterBasedMetric';
import { MetricOptions } from './baseMetric';
import { QueueListener } from '../queues';

export class FailureCountMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, 'job.failed', options);
  }

  static get key(): string {
    return 'failures';
  }

  static get description(): string {
    return 'Job failures';
  }

  static get unit(): string {
    return 'jobs';
  }
}
