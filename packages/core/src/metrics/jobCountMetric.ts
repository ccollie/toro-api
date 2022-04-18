import type { JobState } from 'bullmq';
import { PollingMetric } from './baseMetric';
import { MetricsListener } from './metrics-listener';
import {
  MetricCategory,
  MetricOptions,
  MetricTypes,
  MetricValueType,
  QueueMetricOptions,
} from '../types';
import type { JobStatus } from '../types';
import { getJobCounts } from '../loaders/job-counts';

/**
 * Base class to provide spot/instant values of job counts from a queue.
 * This differs from other queue related metrics in that they are stream based,
 * meaning that they can work even on historical data. This class gets
 * current values from the queue.
 */
export class JobSpotCountMetric extends PollingMetric {
  private readonly _statuses: JobState[];

  // public only for testing
  constructor(props: MetricOptions, statuses: JobState[]) {
    super(props);
    this._statuses = statuses;
  }

  get statuses(): JobStatus[] {
    return this._statuses;
  }

  async checkUpdate(listener: MetricsListener, ts: number): Promise<void> {
    const queue = listener.queue;
    const countsByKey = await getJobCounts(queue, this._statuses);
    const count = Object.values(countsByKey).reduce((sum, count) => sum + count);
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
export class ActiveCountMetric extends JobSpotCountMetric {
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

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class WaitingCountMetric extends JobSpotCountMetric {
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

/**
 * A metric tracking the number of jobs currently awaiting children
 */
export class WaitingChildrenCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['waiting-children']);
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
    super(options, ['completed']);
  }

  static get key(): MetricTypes {
    return MetricTypes.Completed;
  }

  static get description(): string {
    return 'Completed Jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentFailedCountMetric extends JobSpotCountMetric {
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

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentDelayedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, ['delayed']);
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
      'waiting',
    //  'paused',   // todo: uncomment this when paused is supported
      'delayed',
    ]);
  }

  static get key(): MetricTypes {
    return MetricTypes.PendingCount;
  }

  static get description(): string {
    return 'Pending jobs';
  }
}
