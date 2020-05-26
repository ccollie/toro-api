import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';

export class ErrorPercentageMetric extends RateMetric {
  constructor(queueListener: QueueListener, options) {
    super(queueListener, options);
    const update = () => this.update(this.counter.errorPercentage);
    this.counter.on('update', update);
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
