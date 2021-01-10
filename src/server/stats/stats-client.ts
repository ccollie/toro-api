import { Queue } from 'bullmq';
import { DateLike } from '../lib/datetime';
import { getHostStatsKey, getQueueMetaKey, getStatsKey } from '../lib';
import {
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
  Timespan,
} from '@src/types';
import IORedis, { Pipeline } from 'ioredis';
import { TimeSeries } from '../commands/timeseries';
import Emittery from 'emittery';
import logger from '../lib/logger';
import toDate from 'date-fns/toDate';
import { QueueManager } from '../queues';
import { aggregateSnapshots, getRetention } from '../stats/utils';
import { WriteCache } from '../redis';

/**
 * Base class for manipulating and querying collected queue stats in redis
 */
export class StatsClient extends Emittery {
  private readonly queueManager;
  private readonly _client: IORedis.Redis;

  constructor(queueManager: QueueManager) {
    super();
    this.queueManager = queueManager;
    this._client = queueManager.hostManager.client;
    this.onError = this.onError.bind(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  get queue(): Queue {
    return this.queueManager.queue;
  }

  protected get writer(): WriteCache {
    return this.queueManager.hostManager.writer;
  }

  get client(): IORedis.Redis {
    return this._client;
  }

  protected _emit(name: string, data?: any): void {
    this.emit(name, data).catch(this.onError);
  }

  async getRange<T = any>(
    key: string,
    start: DateLike,
    end: DateLike,
    offset?: number,
    count?: number,
  ): Promise<T[]> {
    const results = await TimeSeries.getRange<T>(
      this.client,
      key,
      start,
      end,
      offset,
      count,
    );
    return results.map((x) => x.value);
  }

  async getSpan(
    jobName: string,
    metric: StatsMetricType,
    unit?: StatsGranularity,
  ): Promise<Timespan | null> {
    const key = this.getKey(jobName, metric, unit);
    return TimeSeries.getTimeSpan(this.client, key);
  }

  async getHostSpan(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<Timespan | null> {
    const key = this.getHostKey(jobName, metric, unit);
    return TimeSeries.getTimeSpan(this.client, key);
  }

  async getLast(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot> {
    const key = this.getKey(jobName, metric, unit);
    return TimeSeries.get<StatisticalSnapshot>(this.client, key, '+');
  }

  getStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, metric, unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  async aggregateStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    const items = await this.getStats(jobName, metric, unit, start, end);
    return aggregateSnapshots(items);
  }

  getHostStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getHostKey(jobName, metric, unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  async aggregateHostStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    const items = await this.getHostStats(jobName, metric, unit, start, end);
    return aggregateSnapshots(items);
  }

  async getHostLast(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot> {
    const key = this.getHostKey(jobName, metric, unit);
    return TimeSeries.get<StatisticalSnapshot>(this.client, key, '+');
  }

  async getMeta(): Promise<Record<string, string>> {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    return client.hgetall(key);
  }

  private updateMeta(pipeline: Pipeline, data: Record<string, any>): Pipeline {
    const key = getQueueMetaKey(this.queue);
    pipeline.hmset(key, data);
    return pipeline;
  }

  async setMeta(data: Record<string, any>): Promise<void> {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    await client.hmset(key, data);
  }

  protected updateWriteCursor(
    pipeline: Pipeline,
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    value: DateLike,
  ): Pipeline {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const key = getCursorKey(jobType, type, unit);
    const update = {
      [key]: toDate(value).getTime(),
    };
    return this.updateMeta(pipeline, update);
  }

  async setLastWriteCursor(
    jobType: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    value: DateLike,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const key = getCursorKey(jobType, type, unit);
    const update = {
      [key]: toDate(value).getTime(),
    };

    return this.setMeta(update);
  }

  async getLastWriteCursor(
    jobType: string,
    type: string,
    unit?: string,
  ): Promise<number | null> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const key = getCursorKey(jobType, type, unit);
    let meta = await this.getMeta();
    meta = meta || {};
    // todo: look at
    const value = meta[key];
    if (!value) {
      return 0;
    }

    return parseInt(value, 10);
  }

  /**
   * Clean a range of items
   * @param isHost are we cleaning up host level resources ?
   * @param jobName
   * @param type
   * @param unit
   * @param retention  retention time in ms. Items with score < (latest - retention) are removed
   * @return the number of items removed
   */
  cleanup(
    isHost: boolean,
    jobName: string,
    type: StatsMetricType,
    unit: StatsGranularity,
    retention?: number,
  ): void {
    retention = retention || getRetention(unit);
    const key = isHost
      ? this.getHostKey(jobName, type, unit)
      : this.getKey(jobName, type, unit);

    const multi = this.writer.multi;
    const event = (isHost ? 'host.' : '') + 'stats.cleanup';
    const data = {
      key,
      type,
      unit,
      retention,
    };
    if (!isHost) {
      data['queueId'] = this.queueManager.id;
    }
    TimeSeries.multi.truncate(multi, key, retention);
    this.queueManager.bus.pipelineEmit(multi, event, data);
  }

  async removeRange(
    key: string,
    start: DateLike,
    end: DateLike,
    offset?: number,
    count?: number,
  ): Promise<number> {
    return TimeSeries.removeRange(this.client, key, start, end, offset, count);
  }

  getKey(
    jobName: string,
    metric: StatsMetricType,
    unit?: StatsGranularity,
  ): string {
    return getStatsKey(this.queue, jobName, metric, unit);
  }

  getHostKey(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): string {
    const host = this.queueManager.hostManager.name;
    return getHostStatsKey(host, jobName, metric, unit);
  }

  onError(err: Error) {
    logger.warn(err);
  }
}

function getCursorKey(jobType: string, type: string, unit: string): string {
  jobType = jobType || '~QUEUE';
  const key = [jobType, type, unit].filter((value) => !!value).join('-');
  return `cursor:${key}`;
}
