import { QueueListener } from '../queues';
import { CounterBasedMetric } from './counterBasedMetric';

export class FinishedCountMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options) {
    super(queueListener, {
      ...(options || {}),
      eventName: 'job.finished',
    });
  }

  static get key(): string {
    return 'jobs_completed';
  }

  static get description(): string {
    return 'completed getJobs';
  }
}
