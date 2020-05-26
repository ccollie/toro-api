import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';
import { SlidingWindowOptions } from '../lib';

export class ErrorRateMetric extends RateMetric {
  constructor(queueListener: QueueListener, options?: SlidingWindowOptions) {
    super(queueListener, options);
    const update = () => this.update(this.counter.errorRate);
    this.counter.on('update', update);
  }

  static get key(): string {
    return 'error_rate';
  }

  static get description(): string {
    return 'Error Rate';
  }

  static get unit(): string {
    return 'jobs/sec';
  }
}
