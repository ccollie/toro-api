import { MetricTypes, MetricOptions } from '../types';
import { JobCountMetric } from './jobCountMetric';

/**
 * Tracks the number of finished jobs (i.e. Completed or Failed)
 */
export class FinishedCountMetric extends JobCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['failed', 'completed']);
  }

  static get key(): MetricTypes {
    return MetricTypes.Finished;
  }

  static get description(): string {
    return 'Finished Jobs';
  }
}
