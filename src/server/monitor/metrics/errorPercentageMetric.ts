import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';
import { MetricOptions } from './baseMetric';

export class ErrorPercentageMetric extends RateMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, () => this.errorPercentage, options);
  }

  static get key(): string {
    return 'error_percentage';
  }

  static get description(): string {
    return 'Error Percentage';
  }

  static get unit(): string {
    return '%';
  }
}
