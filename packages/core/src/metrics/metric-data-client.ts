import { Queue } from 'bullmq';
import { DateLike } from '@alpen/shared';
import {
  getGranularitySuffix,
  getHostStatsKey,
  getMetricsDataKey,
  getMetricsKey,
  getQueueMetaKey,
  getStatsKey,
} from '../keys';
import {
  StatsGranularity,
  type StatsMetricType,
  StatsRateType,
} from '../stats/types';
import { Pipeline } from 'ioredis';
import { TimeSeries } from '../commands';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import { logger } from '../logger';
import toDate from 'date-fns/toDate';
import { getCanonicalName, MetricLike } from './utils';
import { WriteCache } from '../redis';
import type { StatisticalSnapshot } from '../stats';
import { getRetention, MeterSummary } from '../stats';
import type { Timespan } from '../types';
import { Metric, MetricName } from '../metrics';

export interface RangeOpts {
  key: string;
  start: DateLike;
  end: DateLike;
  offset?: number;
  count?: number;
}

export interface MetricsClientArgs {
  host: string;
  queueId: string;
  queue: Queue;
  writer?: WriteCache;
}

/**
 * Base class for manipulating and querying collected metrics in redis
 */
export class MetricDataClient extends Emittery {
  private readonly cache: LRUCache<string, any>;
  protected readonly host: string;
  protected readonly queue: Queue;
  protected readonly queueId: string;

  constructor(args: MetricsClientArgs) {
    super();
    const { host, queueId, queue } = args;
    this.host = host;
    this.queue = queue;
    this.queueId = queueId;
    this.onError = this.onError.bind(this);
    this.cache = new LRUCache({
      max: 100,
      ttl: 10000,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  protected _emit(name: string, data?: unknown): void {
    this.emit(name, data).catch(this.onError);
  }

  get indexKey(): string {
    return getMetricsKey(this.queue, null);
  }

  private getDataKey(metric: Metric | MetricName): string {
    return getMetricsDataKey(this.queue, getCanonicalName(metric));
  }

  private async getRange<T = any>(
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

  static pipelineGetRange(pipeline: Pipeline, range: RangeOpts): void {
    const { key, start, end, offset, count } = range;
    TimeSeries.multi.getRange(pipeline, key, start, end, offset, count);
  }

  async getSpan(
    metric: MetricLike,
    unit?: StatsGranularity,
  ): Promise<Timespan | null> {
    const client = await this.queue.client;
    const key = this.getKey(metric, unit);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getHostSpan(
    metric: MetricLike,
    unit: StatsGranularity,
  ): Promise<Timespan | null> {
    const client = await this.queue.client;
    const key = this.getDataKey(metric, unit);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getLast(
    metric: MetricLike,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot | null> {
    const client = await this.queue.client;
    const key = this.getKey(metric, unit);
    // todo: cache this
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
    const args = MetricDataClient.getFetchManyArgs(key, start, end);
    const cacheId = args.cacheKey;
    let data = this.cache.get(cacheId) as T[];
    if (Array.isArray(data)) return data;
    data = await this.getRange<T>(key, args.start, args.end);
    this.cache.set(cacheId, data);
    return data;
  }

  getCachedArray<T = any>(key: string): T[] {
    const data = this.cache.get(key) as T[];
    if (Array.isArray(data)) return data;
    return null;
  }

  getCachedRange<T>(range: RangeOpts): T[] {
    const key = getRangeCacheKey(range);
    return this.getCachedArray(key);
  }

  private async aggregateInternal<T>(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: StatisticalSnapshot[]) => T,
  ): Promise<T> {
    const items = await this.getStats(metric, unit, start, end);
    return fn(items);
  }

  private async aggregateHostInternal<T>(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: StatisticalSnapshot[]) => T,
  ): Promise<T> {
    const items = await this.getHostStats(metric, unit, start, end);
    return fn(items);
  }

  async getStats(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(metric, unit);
    const stats = await this.cachedFetchMany<StatisticalSnapshot>(
      key,
      start,
      end,
    );
    return stats;
  }

  async getAggregateStats(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    return this.aggregateInternal<StatisticalSnapshot>(
      metric,
      unit,
      start,
      end,
      aggregateSnapshots,
    );
  }

  async getAggregateRates(
    unit: StatsGranularity,
    type: StatsRateType,
    start: DateLike,
    end: DateLike,
  ): Promise<MeterSummary> {
    const fn = (items: StatisticalSnapshot[]) => aggregateMeter(items, type);
    return this.aggregateInternal<MeterSummary>(
      'latency',
      unit,
      start,
      end,
      fn,
    );
  }

  async getHostStats(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getHostKey(metric, unit);
    const stats = await this.cachedFetchMany<StatisticalSnapshot>(
      key,
      start,
      end,
    );
    return stats;
  }

  async getAggregateHostStats(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot> {
    return this.aggregateHostInternal<StatisticalSnapshot>(
      metric,
      unit,
      start,
      end,
      aggregateSnapshots,
    );
  }

  async getHostAggregateRates(
    unit: StatsGranularity,
    type: StatsRateType,
    start: DateLike,
    end: DateLike,
  ): Promise<MeterSummary> {
    const fn = (items: StatisticalSnapshot[]) => aggregateMeter(items, type);

    return this.aggregateHostInternal<MeterSummary>(
      'latency',
      unit,
      start,
      end,
      fn,
    );
  }

  async getHostLast(
    metric: MetricLike,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot | null> {
    const key = this.getHostKey(metric, unit);
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
    type: MetricLike,
    unit: StatsGranularity,
    retention?: number,
  ): void {
    retention = retention || getRetention(unit);
    const key = isHost ? this.getHostKey(type, unit) : this.getKey(type, unit);

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

  async removeRange(
    key: string,
    start: DateLike,
    end: DateLike,
    offset?: number,
    count?: number,
  ): Promise<number> {
    const client = await this.queue.client;
    return TimeSeries.removeRange(client, key, start, end, offset, count);
  }

  getKey(metric: MetricLike, unit?: StatsGranularity): string {
    const canonical = getCanonicalName(metric);
    return getStatsKey(this.queue, canonical, unit);
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

export function getRangeCacheKey(opts: RangeOpts): string {
  const { offset = 0, count = -1 } = opts;
  const start = toDate(opts.start).getTime();
  const end = toDate(opts.end).getTime();
  return `${opts.key}:${start}-${end}:${offset}:${count}`;
}

export function getMetricDataKey(
  queue: Queue,
  metric: MetricLike,
  granularity?: StatsGranularity,
): string {
  const parts = ['metrics', getCanonicalName(metric)];
  const suffix = getGranularitySuffix(granularity);
  if (suffix) {
    parts.push(`1${suffix}`);
  }
  const fragment = parts.join(':');
  return queue.toKey(fragment);
}
