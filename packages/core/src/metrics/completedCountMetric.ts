import { MetricOptions, MetricTypes } from '../types';
import { JobCountMetric } from './jobCountMetric';

/**
 * A metric tracking the number of completed jobs in a queue
 */
export class CompletedCountMetric extends JobCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['completed']);
  }

  static get key(): MetricTypes {
    return MetricTypes.Completed;
  }

  static get description(): string {
    return 'Completed Jobs';
  }
}
