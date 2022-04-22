import type { JobState } from 'bullmq';
import { PollingMetric } from './baseMetric';
import type { JobStatus } from '../types';
import { MetricCategory, MetricOptions, MetricValueType } from '../types';
import { getJobCounts } from '../loaders/job-counts';
import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';

/**
 * Base class to provide spot/instant values of job counts from a queue.
 * This differs from other queue related metrics in that they are stream based,
 * meaning that they can work even on historical data. This class gets
 * current values from the queue.
 */
export class JobCountMetric extends PollingMetric {
  private readonly _statuses: JobState[];
  protected lastUpdated: number | null;

  // public only for testing
  constructor(props: MetricOptions, statuses: JobState[]) {
    super(props);
    this._statuses = statuses;
  }

  get statuses(): JobStatus[] {
    return this._statuses;
  }

  async checkUpdate(
    pipeline: Pipeline,
    queue: Queue,
    ts?: number,
  ): Promise<void> {
    const countsByKey = await getJobCounts(queue, this._statuses);
    const count = Object.values(countsByKey).reduce(
      (sum, count) => sum + count,
    );
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
