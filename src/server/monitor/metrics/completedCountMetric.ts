import { CounterBasedMetric } from './counterBasedMetric';
import { MetricOptions } from './baseMetric';

export class CompletedCountMetric extends CounterBasedMetric {
  constructor(queueListener, options: MetricOptions) {
    super(queueListener, 'job.completed', options);
  }

  static get key(): string {
    return 'completed';
  }

  static get description(): string {
    return 'Successful Job Count';
  }

  static get unit(): string {
    return 'jobs';
  }
}
