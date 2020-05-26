import {
  CounterBasedMetric,
  CounterBasedMetricOpts,
} from './counterBasedMetric';
import { QueueListener } from '../queues';

export class FailureCountMetric extends CounterBasedMetric {
  constructor(queueListener: QueueListener, options: CounterBasedMetricOpts) {
    super(queueListener, Object.assign({ eventName: 'job.failed' }, options));
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
