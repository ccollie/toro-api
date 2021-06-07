import { Queue } from 'bullmq';
import {
  BaseMetricSchema,
  QueueBasedMetricSchema,
  QueuePollingMetric,
} from './baseMetric';
import { MetricsListener } from './metrics-listener';
import {
  JobStatusEnum,
  MetricValueType,
  MetricTypes,
  QueueMetricOptions,
  MetricOptions,
} from '../../types';
import { JobEventData } from '../queues';
import { ObjectSchema } from 'joi';

export interface JobSpotCountMetricOptions extends QueueMetricOptions {
  status: JobStatusEnum;
}

/**
 * Base class to provide spot/instant values of job counts from a queue.
 * This differs from other queue related metrics in that they are stream based,
 * meaning that they can work even on historical data. This class gets
 * current values from the queue.
 */
abstract class JobSpotCountMetric extends QueuePollingMetric {
  private queue: Queue;
  private readonly status: JobStatusEnum;

  protected constructor(props: MetricOptions, status: JobStatusEnum) {
    super(props);
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

  static get type(): MetricValueType {
    return MetricValueType.Count;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  handleEvent(event?: JobEventData) {}

  static get schema(): ObjectSchema {
    return QueueBasedMetricSchema;
  }
}

/**
 * A metric tracking the number of currently ACTIVE jobs in a queue
 */
export class CurrentActiveCountMetric extends JobSpotCountMetric {
  constructor(options: QueueMetricOptions) {
    super(options, JobStatusEnum.ACTIVE);
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
    super(options, JobStatusEnum.WAITING);
  }

  static get key(): MetricTypes {
    return MetricTypes.Waiting;
  }

  static get description(): string {
    return 'Waiting jobs';
  }
}

/**
 * A metric tracking the number of currently WAITING jobs in a queue
 */
export class CurrentCompletedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, JobStatusEnum.COMPLETED);
  }

  static get key(): MetricTypes {
    return MetricTypes.CurrentCompletedCount;
  }

  static get description(): string {
    return 'current COMPLETED jobs';
  }
}

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class CurrentFailedCountMetric extends JobSpotCountMetric {
  constructor(options: MetricOptions) {
    super(options, JobStatusEnum.FAILED);
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
    super(options, JobStatusEnum.DELAYED);
  }

  static get key(): MetricTypes {
    return MetricTypes.DelayedJobs;
  }

  static get description(): string {
    return 'Delayed jobs';
  }
}
