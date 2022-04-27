import { Queue, RedisClient } from 'bullmq';
import { DateLike } from '@alpen/shared';
import {
  getHostMetricsKey,
  getMetricsKey,
  getQueueMetricDataKey,
} from '../keys';
import { StatsGranularity } from '../stats/types';
import { Pipeline } from 'ioredis';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import { logger } from '../logger';
import toDate from 'date-fns/toDate';
import { getMetricName, MetricLike } from './utils';
import { getRetention, Meter, MeterSummary } from '../stats';
import { MetricType } from '../metrics';
import ms from 'ms';
import {
  TimeSeriesList,
  TimeseriesListMetadata,
  TimeseriesValue,
} from '../commands/timeseries-list';
import { DDSketch } from '@datadog/sketches-js';
import { BiasedQuantileDistribution, deserializeSketch } from './bqdist';
import { ManualClock } from '../lib';
import { checkMultiErrors } from '~/core';

export interface RangeOpts {
  key: string;
  unit: StatsGranularity;
  start: DateLike;
  end: DateLike;
}

export interface MetricsClientArgs {
  host: string;
  queue: Queue;
  client: RedisClient;
}

const Granularities = [
  StatsGranularity.Hour,
  StatsGranularity.Minute,
  StatsGranularity.Week,
  StatsGranularity.Month,
];

function getPeriod(unit: StatsGranularity): number {
  return ms(`1 ${unit}`);
}

interface ParsedAddParams {
  period: number;
  key: string;
}

function parseAddParams(
  metric: MetricLike,
  unit: StatsGranularity,
  expectedTypes: MetricType[] = [MetricType.Gauge, MetricType.Counter],
): ParsedAddParams {
  const key = this.getKey(metric, unit);
  const mn = getMetricName(metric);
  if (!expectedTypes.includes(mn.type)) {
    const expected = expectedTypes.join(' or ');
    throw new Error(
      `Expected metric type. Expected ${expected}, got ${mn.type}`,
    );
  }
  const period = getPeriod(unit);
  return {
    key,
    period,
  };
}

/**
 * Base class for manipulating and querying collected metrics in redis
 */
export class MetricDataClient extends Emittery {
  private readonly cache: LRUCache<string, any>;
  protected readonly host: string;
  protected readonly queue: Queue;
  private readonly client: RedisClient;
  private _pipeline: Pipeline;

  constructor(args: MetricsClientArgs) {
    super();
    const { host, queue, client } = args;
    this.host = host;
    this.queue = queue;
    this.client = client;
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
    if (!this.queue) {
      return getHostMetricsKey(this.host);
    } else {
      return getMetricsKey(this.queue, null);
    }
  }

  private getDataKey(metric: MetricLike, unit: StatsGranularity): string {
    return this.getKey(metric, unit);
  }

  private async getRange<T = any>(
    key: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<T>[]> {
    const period = getPeriod(unit);
    return TimeSeriesList.getRange<T>(this.client, key, period, start, end);
  }

  private async getRangeBuffer(
    key: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<Buffer>[]> {
    const period = getPeriod(unit);
    return TimeSeriesList.getRangeBuffer(this.client, key, period, start, end);
  }

  static pipelineGetRange(pipeline: Pipeline, range: RangeOpts): void {
    const { key, start, end, unit } = range;
    const period = getPeriod(unit);
    TimeSeriesList.multi.getRange(pipeline, key, period, start, end);
  }

  async getMetadata(
    metric: MetricLike,
    unit: StatsGranularity,
  ): Promise<TimeseriesListMetadata | null> {
    const key = this.getKey(metric, unit);
    return TimeSeriesList.metadata(this.client, key);
  }

  async getLast(
    metric: MetricLike,
    unit: StatsGranularity,
  ): Promise<number | null> {
    const key = this.getKey(metric, unit);
    const period = getPeriod(unit);
    // todo: cache this
    return TimeSeriesList.get<number>(this.client, key, period, '+');
  }

  private static getFetchRangeArgs(
    key: string,
    start: DateLike,
    end: DateLike,
  ): { cacheKey: string; start: number; end: number } {
    start = toDate(start).getTime();
    end = toDate(end).getTime();
    const cacheKey = `${key}:${start}-${end}`;
    return { cacheKey, start, end };
  }

  private async cachedRange<T>(
    key: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<T>[]> {
    const args = MetricDataClient.getFetchRangeArgs(key, start, end);
    const cacheId = args.cacheKey;
    let data = this.cache.get(cacheId) as TimeseriesValue<T>[];
    if (Array.isArray(data)) return data;
    data = await this.getRange<T>(key, unit, start, end);
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

  async add(
    metric: MetricLike,
    unit: StatsGranularity,
    ts: DateLike,
    value: number,
  ): Promise<void> {
    const { key, period } = parseAddParams(metric, unit);
    await TimeSeriesList.add(this.client, key, period, ts, value);
  }

  async pipelineAdd(
    metric: MetricLike,
    unit: StatsGranularity,
    ts: DateLike,
    value: number,
  ): Promise<void> {
    const { key, period } = parseAddParams(metric, unit);
    await TimeSeriesList.multi.add(this.pipeline, key, period, ts, value);
  }

  async addDistribution(
    metric: MetricLike,
    unit: StatsGranularity,
    ts: DateLike,
    value: BiasedQuantileDistribution,
  ): Promise<void> {
    const { key, period } = parseAddParams(metric, unit, [
      MetricType.Distribution,
    ]);
    const buf = value.serializeData();
    await TimeSeriesList.addBuffer(this.client, key, period, ts, buf);
  }

  async getNumericRange(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<number>[]> {
    const key = this.getKey(metric, unit);
    const mn = getMetricName(metric);
    if (mn.type === MetricType.Distribution) {
      throw new Error('Expected Counter or Gauge');
    }
    return this.getRange<number>(key, unit, start, end);
  }

  async getDistributionRange(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<DDSketch>[]> {
    const key = this.getKey(metric, unit);
    const items = await this.getRangeBuffer(key, unit, start, end);
    const result: TimeseriesValue<DDSketch>[] = [];
    items.forEach((item) => {
      try {
        const sketch = deserializeSketch(item.value);
        result.push({ timestamp: item.timestamp, value: sketch });
      } catch (e) {
        logger.warn(e);
      }
    });
    return result;
  }

  async aggregateDistribution(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<DDSketch> {
    const data = await this.getDistributionRange(metric, unit, start, end);
    const result = new DDSketch();
    data.forEach(({ value: sketch }) => {
      result.merge(sketch);
      // https://github.com/DataDog/sketches-js/pull/18
      result.zeroCount += sketch.zeroCount;
    });
    return result;
  }

  async aggregateToDistribution(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<DDSketch> {
    const data = await this.getNumericRange(metric, unit, start, end);
    const result = new DDSketch();
    data.forEach(({ value }) => {
      result.accept(value);
    });
    return result;
  }

  async aggregateNumeric<T = number>(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: TimeseriesValue<number>[]) => T,
  ): Promise<T> {
    const items = await this.getNumericRange(metric, unit, start, end);
    return fn(items);
  }

  async getAggregateRates(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<MeterSummary> {
    // todo: cache if endDate < Date.now()
    return this.aggregateNumeric(metric, unit, start, end, aggregateMeter);
  }

  /**
   * Clean a range of items
   * @param metric
   */
  pipelinePrune(metric: MetricLike): void {
    Granularities.forEach((unit) => {
      const key = this.getDataKey(metric, unit);
      const retention = getRetention(unit);
      TimeSeriesList.multi.truncate(this.pipeline, key, retention);
    });
    // TODO: pass in bus
    // const event = (isHost ? 'host.' : '') + 'stats.cleanup';
    // this.queueManager.bus.pipelineEmit(pipeline, event, data);
  }

  pipelineDeleteMetric(metric: MetricLike): Pipeline {
    const keys = Granularities.map((unit) => this.getDataKey(metric, unit));
    return this.pipeline.del(...keys);
  }

  async deleteMetric(metric: MetricLike): Promise<number> {
    const keys = Granularities.map((unit) => this.getDataKey(metric, unit));
    return this.client.del(keys);
  }

  getKey(metric: MetricLike, unit?: StatsGranularity): string {
    if (!this.queue) {
      return getHostMetricsKey(this.host, metric, unit);
    }
    return getQueueMetricDataKey(this.queue, metric, unit);
  }

  getHostKey(metric: MetricLike, unit: StatsGranularity): string {
    return getHostMetricsKey(this.host, metric, unit);
  }

  onError(err: Error): void {
    logger.warn(err);
  }

  get pipeline(): Pipeline {
    if (!this._pipeline) {
      this._pipeline = this.client.pipeline();
    }
    return this._pipeline;
  }

  async flush(): Promise<unknown[]> {
    if (this._pipeline) {
      const result = this._pipeline.exec().then(checkMultiErrors);
      this._pipeline = null;
      return result;
    }
    return [];
  }
}

export function getRangeCacheKey(opts: RangeOpts): string {
  const start = toDate(opts.start).getTime();
  const end = toDate(opts.end).getTime();
  return `${opts.key}:${start}-${end}`;
}

export function aggregateMeter(recs: TimeseriesValue<number>[]): MeterSummary {
  const clock = new ManualClock();
  const meter = new Meter(clock);
  recs.forEach((rec) => {
    clock.set(rec.timestamp);
    meter.mark(rec.value);
  });

  return meter.getSummary();
}
