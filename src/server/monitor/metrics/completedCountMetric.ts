import {
  CounterBasedMetric,
  CounterBasedMetricOpts,
} from './counterBasedMetric';

export class CompletedCountMetric extends CounterBasedMetric {
  constructor(queueListener, options: CounterBasedMetricOpts) {
    super(queueListener, {
      eventName: 'job.completed',
      ...options,
    });
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
