import { Queue } from 'bullmq';
import { PollingMetric } from './baseMetric';
import { MetricsListener } from './metricsListener';
import { JobStatusEnum, MetricType, PollingMetricOptions } from '../../types';

export interface JobSpotCountMetricOptions extends PollingMetricOptions {
  status: JobStatusEnum;
}

/**
 * Base class to provide spot/instant values of job counts from a queue.
 * This differs from other queue related in that they are stream based,
 * meaning that they can work even on historical data. This class gets
 * current values from the queue.
 */
class JobSpotCountMetric extends PollingMetric {
  private queue: Queue;
  private readonly status: JobStatusEnum;
  private readonly _interval: number;

  constructor(props: PollingMetricOptions, status: JobStatusEnum) {
    super(props);
    this._interval = props.interval;
    this.status = status;
  }

  async checkUpdate(): Promise<void> {
    if (this.queue) {
      const counts = await this.queue.getJobCounts(this.status);
      const val = (counts || {})[this.status];
      this.update(val);
    }
  }

  init(listener: MetricsListener): void {
    super.init(listener);
    this.queue = listener.queueListener.queue;
  }

  get validEvents(): string[] {
    return [];
  }

  static get unit(): string {
    return 'jobs';
  }

  static get type(): MetricType {
    return MetricType.Count;
  }
}

/**
 * A metric tracking the number of currently ACTIVE jobs in a queue
 */
export class CurrentActiveCountMetric extends JobSpotCountMetric {
  constructor(options: PollingMetricOptions) {
    super(options, JobStatusEnum.ACTIVE);
  }

  static get key(): string {
    return 'current_active';
  }

  static get description(): string {
    return 'currently ACTIVE jobs';
  }
}

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class CurrentWaitingCountMetric extends JobSpotCountMetric {
  constructor(options: PollingMetricOptions) {
    super(options, JobStatusEnum.WAITING);
  }

  static get key(): string {
    return 'current_waiting';
  }

  static get description(): string {
    return 'Waiting jobs';
  }
}

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class CurrentCompletedCountMetric extends JobSpotCountMetric {
  constructor(options: PollingMetricOptions) {
    super(options, JobStatusEnum.COMPLETED);
  }

  static get key(): string {
    return 'current_completed';
  }

  static get description(): string {
    return 'current COMPLETED jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentFailedCountMetric extends JobSpotCountMetric {
  constructor(options: PollingMetricOptions) {
    super(options, JobStatusEnum.FAILED);
  }

  static get key(): string {
    return 'current_failed';
  }

  static get description(): string {
    return 'current FAILED jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentDelayedCountMetric extends JobSpotCountMetric {
  constructor(options: PollingMetricOptions) {
    super(options, JobStatusEnum.DELAYED);
  }

  static get key(): string {
    return 'current_delayed';
  }

  static get description(): string {
    return 'Delayed jobs';
  }
}
