import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';
import { MetricOptions } from './baseMetric';

export class JobRateMetric extends RateMetric {
  constructor(queueListener: QueueListener, options: MetricOptions) {
    super(queueListener, () => this.jobRate, options);
  }

  static get key(): string {
    return 'job_rate';
  }

  static get description(): string {
    return 'Job Rate';
  }

  static get unit(): string {
    return 'getJobs/sec';
  }
}
