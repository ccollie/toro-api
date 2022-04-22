import { MetricOptions, MetricTypes } from '../types';
import { JobCountMetric } from './jobCountMetric';

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class WaitingCountMetric extends JobCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['waiting']);
  }

  static get key(): MetricTypes {
    return MetricTypes.Waiting;
  }

  static get description(): string {
    return 'Waiting Jobs';
  }
}
