import { BaseMetric } from './baseMetric';
import { QueueListener } from '../queues';

export class LatencyMetric extends BaseMetric {
  constructor(queueListener: QueueListener) {
    super();
    this.onDestroy(
      queueListener.on('job.finished', (data) => this.update(data)),
    );
  }

  baseUpdate(value) {
    return value.latency;
  }

  static get key(): string {
    return 'latency';
  }

  static get description(): string {
    return 'Job Latency';
  }

  static get unit(): string {
    return 'ms';
  }
}
