import { JobCountMetric } from './jobCountMetric';
import { MetricTypes, QueueMetricOptions } from '../types';

/**
 * A metric tracking the number of currently ACTIVE jobs in a queue
 */
export class ActiveCountMetric extends JobCountMetric {
  constructor(options: QueueMetricOptions) {
    super(options, ['active']);
  }

  static get key(): MetricTypes {
    return MetricTypes.ActiveJobs;
  }

  static get description(): string {
    return 'Active Jobs';
  }
}
