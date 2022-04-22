import { JobCountMetric } from './jobCountMetric';
import { MetricOptions, MetricTypes } from '../types';

/**
 * A metric tracking the number of currently failed jobs in a queue
 */
export class FailedCountMetric extends JobCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['failed']);
  }

  static get key(): MetricTypes {
    return MetricTypes.Failures;
  }

  static get description(): string {
    return 'Failed Jobs';
  }
}
