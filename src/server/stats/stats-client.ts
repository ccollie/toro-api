import { Queue } from 'bullmq';
import { EventBus, WriteCache } from '../redis';
import { DateLike, parseTimestamp } from '../lib/datetime';
import { StatsClientBase } from './statsClientBase';
import { getQueueBusKey } from '../lib/keys';
import {
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
} from '@src/types';
import { isNil } from 'lodash';
import { systemClock } from '../lib';
import IORedis from 'ioredis';
import { QueueManager } from '../queues';

/* eslint @typescript-eslint/no-use-before-define: 0 */

export type StatsWriteOptions = {
  jobType: string;
  ts: number | Date;
  type: StatsMetricType;
  unit?: StatsGranularity;
};

/**
 * A helper class responsible for managing collected queue stats in redis
 */
export class StatsClient extends StatsClientBase {
  readonly queue: Queue;
  /**
   * The queue event bus
   */
  private readonly bus: EventBus;
  private readonly writer: WriteCache;

  constructor(queueManager: QueueManager) {
    super(queueManager.queue);
    this.queue = queueManager.queue;
    const { writer, bus } = queueManager.hostManager;
    this.writer = writer;
    this.bus = bus;
  }

  get client(): IORedis.Redis {
    return this.writer.client;
  }

  get hasLock(): boolean {
    return this.writer.hasLock;
  }

  get busKey(): string {
    return getQueueBusKey(this.queue);
  }

  async cleanup(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    retention: number,
  ): Promise<void> {
    const srcKey = this.getKey(jobType, type, unit);
    const multi = this.writer.multi;

    await this._callStats(multi, 'cleanup', srcKey, retention);
  }

  getLatency(
    jobName: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'latency', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  getWaitTimes(
    jobName: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'wait', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  private onStatsUpdate(
    type: StatsMetricType,
    jobName: string,
    granularity: StatsGranularity,
    since?: DateLike,
  ): AsyncIterator<StatisticalSnapshot> {
    function filter(_, data: any): boolean {
      let good =
        data &&
        data.value &&
        (!data.jobName || data.jobName === jobName) &&
        (!data.unit || data.unit === granularity);

      if (good && !isNil(since)) {
        const ts = parseTimestamp(since, systemClock.getTime());
        good = data.ts && data.ts > ts;
      }
      return good;
    }

    function transform(_, data: any): StatisticalSnapshot {
      return JSON.parse(data.value) as StatisticalSnapshot;
    }

    const eventName = `stats.${type}.updated`;
    return this.bus.createAsyncIterator<any, StatisticalSnapshot>({
      eventNames: [eventName],
      filter,
      transform,
    });
  }

  latencyStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate(
      'latency',
      jobName,
      granularity,
      systemClock.getTime(),
    );
  }

  waitTimeStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate(
      'wait',
      jobName,
      granularity,
      systemClock.getTime(),
    );
  }
}
