import { Queue, RedisClient } from 'bullmq';
import { DateLike } from '../lib/datetime';
import { getHostStatsKey, getQueueMetaKey, getStatsKey } from '../lib';
import {
  MeterSummary,
  StatisticalSnapshot,
  StatsGranularity,
  StatsMetricType,
  StatsRateType,
  Timespan,
} from '../../types';
import { Pipeline } from 'ioredis';
import { TimeSeries } from '../commands/timeseries';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import logger from '../lib/logger';
import toDate from 'date-fns/toDate';
import { QueueManager } from '../queues';
import {
  aggregateSnapshots,
  getRetention,
  aggregateMeter,
} from '../stats/utils';
import { WriteCache } from '../redis';
import { isEmpty } from 'lodash';

/**
 * Base class for manipulating and querying collected queue stats in redis
 */
export class StatsClient extends Emittery {
  private readonly queueManager;
  private readonly _client: RedisClient;
  private readonly cache: LRUCache;

  constructor(queueManager: QueueManager) {
    super();
    this.queueManager = queueManager;
    this._client = queueManager.hostManager.client;
    this.onError = this.onError.bind(this);
    this.cache = new LRUCache({
      max: 200,
      maxAge: 5000,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  get queue(): Queue {
    return this.queueManager.queue;
  }

  protected get writer(): WriteCache {
    return this.queueManager.hostManager.writer;
  }

  get client(): RedisClient {
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

  private async cachedFetchMany<T>(
    key: string,
    start: DateLike,
    end: DateLike,
  ): Promise<T[]> {
    start = toDate(start).getTime();
    end = toDate(end).getTime();
    const cacheId = `${key}:${start}-${end}`;
    let data = this.cache.get(cacheId) as T[];
    if (Array.isArray(data)) return data;
    data = await this.getRange<T>(key, start, end);
    this.cache.set(cacheId, data);
    return data;
  }

  private async aggregateInternal<T>(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: StatisticalSnapshot[]) => T,
  ): Promise<T> {
    const items = await this.getStats(jobName, metric, unit, start, end);
    return fn(items);
  }

  private async aggregateHostInternal<T>(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: StatisticalSnapshot[]) => T,
  ): Promise<T> {
    const items = await this.getHostStats(jobName, metric, unit, start, end);
    return fn(items);
  }

  async getStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, metric, unit);
    const stats = await this.cachedFetchMany<StatisticalSnapshot>(
      key,
      start,
      end,
    );
    return stats.map(StatsClient.fixRates); //hacky
  }

  async getAggregateStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    return this.aggregateInternal<StatisticalSnapshot>(
      jobName,
      metric,
      unit,
      start,
      end,
      aggregateSnapshots,
    );
  }

  async getAggregateRates(
    jobName: string,
    unit: StatsGranularity,
    type: StatsRateType,
    start: DateLike,
    end: DateLike,
  ): Promise<MeterSummary> {
    const fn = (items: StatisticalSnapshot[]) => aggregateMeter(items, type);
    return this.aggregateInternal<MeterSummary>(
      jobName,
      'latency',
      unit,
      start,
      end,
      fn,
    );
  }

  // HACK.
  private static fixRates(stats: StatisticalSnapshot): StatisticalSnapshot {
    const { rates, ...rest } = stats as any;
    if (!isEmpty(rates)) {
      stats = { ...rest };
      stats.m1Rate = rest['1'] ?? 0;
      stats.m5Rate = rest['5'] ?? 0;
      stats.m15Rate = rest['15'] ?? 0;
    }
    return stats;
  }

  async getHostStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getHostKey(jobName, metric, unit);
    const stats = await this.cachedFetchMany<StatisticalSnapshot>(
      key,
      start,
      end,
    );
    return stats.map(StatsClient.fixRates);
  }

  async getAggregateHostStats(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    return this.aggregateHostInternal<StatisticalSnapshot>(
      jobName,
      metric,
      unit,
      start,
      end,
      aggregateSnapshots,
    );
  }

  async getHostAggregateRates(
    jobName: string,
    unit: StatsGranularity,
    type: StatsRateType,
    start: DateLike,
    end: DateLike,
  ): Promise<MeterSummary> {
    const fn = (items: StatisticalSnapshot[]) => aggregateMeter(items, type);

    return this.aggregateHostInternal<MeterSummary>(
      jobName,
      'latency',
      unit,
      start,
      end,
      fn,
    );
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

  onError(err: Error): void {
    logger.warn(err);
  }
}

function getCursorKey(jobType: string, type: string, unit: string): string {
  jobType = jobType || '~QUEUE';
  const key = [jobType, type, unit].filter((value) => !!value).join('-');
  return `cursor:${key}`;
}
