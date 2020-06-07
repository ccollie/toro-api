import { QueueListener } from '../queues';
import { CounterBasedMetric } from './counterBasedMetric';
import { MetricOptions } from '@src/server/metrics/baseMetric';

export class FinishedCountMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, 'job.finished', options);
  }

  static get key(): string {
    return 'jobs_finished';
  }

  static get description(): string {
    return 'completed jobs (failed or completed)';
  }
}
