import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';
import { MetricOptions } from './baseMetric';

export class ErrorRateMetric extends RateMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, () => this.errorRate, options);
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
