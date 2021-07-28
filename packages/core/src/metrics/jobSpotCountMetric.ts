import { PollingMetric } from './baseMetric';
import { MetricsListener } from './metrics-listener';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
  QueueMetricOptions,
} from './types';
import { JobStatusEnum } from '../queues/types';

/**
 * Base class to provide spot/instant values of job counts from a queue.
 * This differs from other queue related metrics in that they are stream based,
 * meaning that they can work even on historical data. This class gets
 * current values from the queue.
 */
export class JobSpotCountMetric extends PollingMetric {
  private readonly _statuses: JobStatusEnum[];

  // public only for testing
  constructor(props: MetricOptions, statuses: JobStatusEnum[]) {
    super(props);
    this._statuses = statuses;
  }

  get statuses(): JobStatusEnum[] {
    return this._statuses;
  }

  async checkUpdate(listener: MetricsListener, ts: number): Promise<void> {
    const count = await listener.queue.getJobCountByTypes(...this._statuses);
    this.update(count, ts);
  }

  static get unit(): string {
    return 'jobs';
  }

  static get category(): MetricCategory {
    return MetricCategory.Queue;
  }

  static get type(): MetricValueType {
    return MetricValueType.Gauge;
  }
}

/**
 * A metric tracking the number of currently ACTIVE jobs in a queue
 */
export class CurrentActiveCountMetric extends JobSpotCountMetric {
  constructor(options: QueueMetricOptions) {
    super(options, [JobStatusEnum.ACTIVE]);
  }

  static get key(): MetricTypes {
    return MetricTypes.ActiveJobs;
  }

  static get description(): string {
    return 'Active jobs';
  }
}

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class CurrentWaitingCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, [JobStatusEnum.WAITING]);
  }

  static get key(): MetricTypes {
    return MetricTypes.Waiting;
  }

  static get description(): string {
    return 'Waiting Jobs';
  }
}

/**
 * A metric tracking the number of jobs currently awaiting children
 */
export class WaitingChildrenCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, [JobStatusEnum.WAITING, JobStatusEnum.PAUSED]);
  }

  static get key(): MetricTypes {
    return MetricTypes.WaitingChildren;
  }

  static get description(): string {
    return 'Jobs awaiting children';
  }
}

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class CurrentCompletedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, [JobStatusEnum.COMPLETED]);
  }

  static get key(): MetricTypes {
    return MetricTypes.CurrentCompletedCount;
  }

  static get description(): string {
    return 'Current COMPLETED Jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentFailedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, [JobStatusEnum.FAILED]);
  }

  static get key(): MetricTypes {
    return MetricTypes.CurrentFailedCount;
  }

  static get description(): string {
    return 'Failed Jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentDelayedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, [JobStatusEnum.DELAYED]);
  }

  static get key(): MetricTypes {
    return MetricTypes.DelayedJobs;
  }

  static get description(): string {
    return 'Delayed jobs';
  }
}

/**
 * This class tracks the count of pending jobs (the number of jobs waiting to be processed)
 * i.e. jobs in waiting, paused or delayed state
 */
export class PendingCountMetric extends JobSpotCountMetric {
  constructor(props: MetricOptions) {
    super(props, [
      JobStatusEnum.WAITING,
      JobStatusEnum.PAUSED,
      JobStatusEnum.DELAYED,
    ]);
  }

  static get key(): MetricTypes {
    return MetricTypes.PendingCount;
  }

  static get description(): string {
    return 'Pending jobs';
  }
}
