import { RateMetric } from './rateMetric';
import { QueueListener } from '../queues';
import { SlidingWindowOptions } from '../lib/slidingWindow';

export class JobRateMetric extends RateMetric {
  constructor(queueListener: QueueListener, options?: SlidingWindowOptions) {
    super(queueListener, options);
    const update = () => this.update(this.counter.jobRate);
    this.counter.on('update', update);
  }

  get successes(): number {
    return this.counter.successes;
  }

  get failures(): number {
    return this.counter.failures;
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
