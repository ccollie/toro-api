import { Queue } from 'bullmq';
import { DateLike, isEmpty } from '@alpen/shared';
import {
  getHostStatsKey,
  getQueueMetaKey,
  getStatsKey,
} from '../keys';
import { StatsGranularity, type StatsMetricType, StatsRateType } from './types';
import { Pipeline } from 'ioredis';
import { TimeSeries } from '../commands';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import { logger } from '../logger';
import toDate from 'date-fns/toDate';
import { aggregateSnapshots, getRetention, aggregateMeter } from './utils';
import { WriteCache } from '../redis';
import { MeterSummary } from './meter';
import type { Timespan } from '../types';
import type { StatisticalSnapshot } from './timer';

export interface StatsClientArgs {
  host: string;
  queueId: string;
  queue: Queue;
  writer?: WriteCache;
}

/**
 * Base class for manipulating and querying collected queue stats in redis
 */
export class StatsClient extends Emittery {
  private readonly cache: LRUCache<string, any>;
  protected readonly host: string;
  protected readonly queue: Queue;
  protected readonly queueId: string;

  constructor(args: StatsClientArgs) {
    super();
    const { host, queueId, queue } = args;
    this.host = host;
    this.queue = queue;
    this.queueId = queueId;
    this.onError = this.onError.bind(this);
    this.cache = new LRUCache({
      max: 200,
      ttl: 10000,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  protected _emit(name: string, data?: unknown): void {
    this.emit(name, data).catch(this.onError);
  }

  async getRange<T = any>(
    key: string,
    start: DateLike,
    end: DateLike,
    offset?: number,
    count?: number,
  ): Promise<T[]> {
    const client = await this.queue.client;
    const results = await TimeSeries.getRange<T>(
      client,
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
    const client = await this.queue.client;
    const key = this.getKey(jobName, metric, unit);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getHostSpan(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<Timespan | null> {
    const client = await this.queue.client;
    const key = this.getHostKey(jobName, metric, unit);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getLast(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot | null> {
    const client = await this.queue.client;
    const key = this.getKey(jobName, metric, unit);
    return TimeSeries.get<StatisticalSnapshot>(client, key, '+');
  }

  private static getFetchManyArgs(
    key: string,
    start: DateLike,
    end: DateLike,
  ): { cacheKey: string; start: number; end: number } {
    start = toDate(start).getTime();
    end = toDate(end).getTime();
    const cacheKey = `${key}:${start}-${end}`;
    return { cacheKey, start, end };
  }

  private async cachedFetchMany<T>(
    key: string,
    start: DateLike,
    end: DateLike,
  ): Promise<T[]> {
    const args = StatsClient.getFetchManyArgs(key, start, end);
    const cacheId = args.cacheKey;
    let data = this.cache.get(cacheId) as T[];
    if (Array.isArray(data)) return data;
    data = await this.getRange<T>(key, args.start, args.end);
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
  ): Promise<StatisticalSnapshot | null> {
    const key = this.getHostKey(jobName, metric, unit);
    const client = await this.queue.client;
    return TimeSeries.get<StatisticalSnapshot>(client, key, '+');
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
    jobType: string | null,
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
   * @param pipeline
   * @param isHost are we cleaning up host level resources ?
   * @param jobName
   * @param type
   * @param unit
   * @param retention  retention time in ms. Items with score < (latest - retention) are removed
   * @return the number of items removed
   */
  cleanup(
    pipeline: Pipeline,
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

    const data = {
      key,
      type,
      unit,
      retention,
    };
    if (!isHost) {
      data['queueId'] = this.queueId;
    }
    TimeSeries.multi.truncate(pipeline, key, retention);
    // TODO: pass in bus
    // const event = (isHost ? 'host.' : '') + 'stats.cleanup';
    // this.queueManager.bus.pipelineEmit(pipeline, event, data);
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
    return getHostStatsKey(this.host, jobName, metric, unit);
  }

  onError(err: Error): void {
    logger.warn(err);
  }
}

function getCursorKey(
  jobType: string | null,
  type: string,
  unit: string,
): string {
  jobType = jobType && jobType.length ? jobType : '~QUEUE';
  const key = [jobType, type, unit].filter((value) => !!value).join('-');
  return `cursor:${key}`;
}
