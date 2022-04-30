import {Queue, RedisClient} from 'bullmq';
import {DateLike, endOf, startOf} from '@alpen/shared';
import {getHostMetricsKey, getMetricsKey, getQueueMetricDataKey,} from '../keys';
import {StatsSnapshot} from '../stats/types';
import {Pipeline} from 'ioredis';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import {logger} from '../logger';
import toDate from 'date-fns/toDate';
import {CONFIG, getMetricName, getPeriod, getRetention, mergeSketches, MetricLike,} from './utils';
import {OnlineNormalEstimator} from '../stats';
import {getSketchAggregateValue} from './aggregators';
import {Meter, MeterSummary} from './meter';
import {MetricAggregateByType} from '../metrics';
import {MetricName} from './metric-name';
import {MetricGranularity, MetricType} from './types';
import {
  TimeSeriesList,
  TimeseriesListMetadata,
  TimeseriesValue,
} from '../commands/timeseries-list';
import {DDSketch} from '@datadog/sketches-js';
import {BiasedQuantileDistribution, deserializeSketch, serializeSketch,} from './bqdist';
import {ManualClock} from '../lib';
import {checkMultiErrors} from '../redis';
import {AggregationType, getAggregateFunction,} from './aggregators/aggregation';
import boom from '@hapi/boom';
import {Snapshot} from './snapshot';
import {round} from 'lodash';

export interface RangeOpts {
  key: string;
  unit: MetricGranularity;
  start: DateLike;
  end: DateLike;
}

export interface MetricsClientArgs {
  host: string;
  queue: Queue;
  client: RedisClient;
}

const Granularities = [
  MetricGranularity.Hour,
  MetricGranularity.Minute,
  MetricGranularity.Week,
  MetricGranularity.Month,
];

interface RollupMeta {
  start: Date;
  end: Date;
  unit: MetricGranularity;
  sketch?: DDSketch;
  value?: number;
}

interface ParsedAddParams {
  period: number;
  key: string;
}

function parseAddParams(
  metric: MetricLike,
  unit: MetricGranularity,
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
    this.storeSnapshot = this.storeSnapshot.bind(this);
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
      return getMetricsKey(this.host, this.queue, null);
    }
  }

  private getDataKey(metric: MetricLike, unit: MetricGranularity): string {
    return this.getKey(metric, unit);
  }

  private async getRange<T = any>(
    key: string,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<T>[]> {
    const period = getPeriod(unit);
    return TimeSeriesList.getRange<T>(this.client, key, period, start, end);
  }

  private async getRangeBuffer(
    key: string,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<Buffer>[]> {
    const period = getPeriod(unit);
    return TimeSeriesList.getRangeBuffer(this.client, key, period, start, end);
  }

  pipelineGetBuffer(
    metric: MetricLike,
    unit: MetricGranularity,
    ts: DateLike,
  ): Pipeline {
    const period = getPeriod(unit);
    const key = this.getKey(metric, unit);
    return TimeSeriesList.multi.getBuffer(this.pipeline, key, period, ts);
  }

  pipelineGetRangeBuffer(
    metric: MetricLike,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
  ): Pipeline {
    const period = getPeriod(unit);
    const key = this.getKey(metric, unit);
    return TimeSeriesList.multi.getRangeBuffer(
      this.pipeline,
      key,
      period,
      start,
      end,
    );
  }

  static pipelineGetRange(pipeline: Pipeline, range: RangeOpts): void {
    const { key, start, end, unit } = range;
    const period = getPeriod(unit);
    TimeSeriesList.multi.getRange(pipeline, key, period, start, end);
  }

  async getMetadata(
    metric: MetricLike,
    unit: MetricGranularity,
  ): Promise<TimeseriesListMetadata | null> {
    const key = this.getKey(metric, unit);
    return TimeSeriesList.metadata(this.client, key);
  }

  async getLast(
    metric: MetricLike,
    unit: MetricGranularity,
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
    unit: MetricGranularity,
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
    unit: MetricGranularity,
    ts: DateLike,
    value: number,
  ): Promise<void> {
    const { key, period } = parseAddParams(metric, unit);
    await TimeSeriesList.add(this.client, key, period, ts, value);
  }

  pipelineAdd(
    metric: MetricLike,
    unit: MetricGranularity,
    ts: DateLike,
    value: number,
  ): void {
    const { key, period } = parseAddParams(metric, unit);
    TimeSeriesList.multi.add(this.pipeline, key, period, ts, value);
  }

  pipelineAddDistribution(
    metric: MetricLike,
    unit: MetricGranularity,
    ts: DateLike,
    value: BiasedQuantileDistribution | DDSketch,
  ): Pipeline {
    const { key, period } = parseAddParams(metric, unit, [
      MetricType.Distribution,
    ]);

    let buf: Uint8Array;
    if (value instanceof BiasedQuantileDistribution) {
      buf = value.serializeData();
    } else {
      buf = serializeSketch(value);
    }

    return TimeSeriesList.multi.addBuffer(this.pipeline, key, period, ts, buf);
  }

  async addDistribution(
    metric: MetricLike,
    unit: MetricGranularity,
    ts: DateLike,
    value: BiasedQuantileDistribution,
  ): Promise<void> {
    const { key, period } = parseAddParams(metric, unit, [
      MetricType.Distribution,
    ]);
    const buf = value.serializeData();
    await TimeSeriesList.addBuffer(this.client, key, period, ts, buf);
  }

  /* Write and rollup distribution to higher granularity */
  async writeDistribution(
    metric: MetricLike,
    sketch: DDSketch,
    unit = MetricGranularity.Minute,
    ts = Date.now(),
  ): Promise<void> {
    const getRollupValues = async (ts: number): Promise<RollupMeta[]> => {
      const rollupMeta: RollupMeta[] = [];
      CONFIG.units.forEach((unit) => {
        // skip the src
        if (unit === MetricGranularity.Minute) return;

        const start = startOf(ts, unit);
        const end = endOf(ts, unit);

        rollupMeta.push({
          start,
          end,
          unit,
        });
      });

      // get destination data
      rollupMeta.forEach((meta) => {
        const { start, unit } = meta;
        this.pipelineGetBuffer(metric, unit, start);
      });

      const items = await this.flush();
      items.forEach((item, index) => {
        if (!item) return;
        const meta = rollupMeta[index];
        const mn = getMetricName(metric);

        const buf = item as Buffer;
        if (mn.type === MetricType.Distribution) {
          try {
            meta.sketch = deserializeSketch(buf);
          } catch (e) {
            logger.warn(e);
          }
        } else {
          meta.value = parseInt(buf.toString());
        }
      });

      return rollupMeta;
    };

    const rollup = async (source: DDSketch, ts: number): Promise<void> => {
      const rollupMeta = await getRollupValues(ts);

      rollupMeta.forEach((meta) => {
        const { start, unit, sketch } = meta;

        if (sketch) {
          const merged = mergeSketches(null, [sketch, source]);
          this.pipelineAddDistribution(metric, unit, start, merged);
        }
      });
    };

    this.pipelineAddDistribution(metric, unit, ts, sketch);
    if (unit === MetricGranularity.Minute) {
      // only rollup events at lowest granularity
      await rollup(sketch, ts);
    }

    await this.flush();
  }

  async storeSnapshot(snapshot: Snapshot): Promise<void> {
    const ts = snapshot.timestamp;
    const unit = MetricGranularity.Minute;

    const numerics = new Map<MetricName, number>(snapshot.map);
    for (const [name, sketch] of snapshot.distributions) {
      numerics.delete(name);
      await this.writeDistribution(name, sketch, unit, ts);
    }
    for (const [name, value] of numerics) {
      this.pipelineAdd(name, unit, ts, value);
    }

    await this.flush();
  }

  async getNumericRange(
    metric: MetricLike,
    unit: MetricGranularity,
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
    unit: MetricGranularity,
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
    unit: MetricGranularity,
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
    unit: MetricGranularity,
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
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
    fn: (items: TimeseriesValue<number>[]) => T,
  ): Promise<T> {
    const items = await this.getNumericRange(metric, unit, start, end);
    return fn(items);
  }

  async getMetricScalarValues(
    metric: MetricLike,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
    aggregation?: AggregationType,
    // aggregateValue?: number // for specific percentile or rate interval
  ): Promise<TimeseriesValue<number>[]> {
    const mn = getMetricName(metric);
    if (mn.type === MetricType.Distribution) {
      const aggregator = aggregation ?? mn.defaultAggregation;
      const series = await this.getDistributionRange(metric, unit, start, end);
      return series.map((dataPoint) => {
        return {
          timestamp: dataPoint.timestamp,
          value: getSketchAggregateValue(dataPoint.value, aggregator),
        };
      });
    } else {
      return this.getNumericRange(metric, unit, start, end);
    }
    // todo: cache if end < Date.now()
  }

  async aggregate(
    metric: MetricLike,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
    aggregator: AggregationType,
    // aggregateValue?: number // for specific percentile or rate interval
  ): Promise<number> {
    const mn = getMetricName(metric);
    const validAggregates = MetricAggregateByType[mn.type];
    if (!validAggregates.includes(aggregator)) {
      throw boom.badRequest(
        `Invalid aggregator ${aggregator} for metric ${mn.type}`,
      );
    }
    if (mn.type === MetricType.Distribution) {
      const sketch = await this.aggregateDistribution(metric, unit, start, end);
      return getSketchAggregateValue(sketch, aggregator);
    } else {
      const fn = getAggregateFunction(aggregator);
      return this.aggregateNumeric(metric, unit, start, end, (items) => {
        const values = items.map((x) => x.value);
        return fn(values);
      });
    }
    // todo: cache if end < Date.now()
  }

  async getStats(
    metric: MetricLike,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
    aggregation?: AggregationType,
  ): Promise<StatsSnapshot> {
    // todo: cache if endDate < Date.now()
    const values = await this.getMetricScalarValues(
      metric,
      unit,
      start,
      end,
      aggregation,
    );
    const data = values.map((x) => x.value);
    return aggregateSnapshot(data);
  }

  async getRate(
    metric: MetricLike,
    unit: MetricGranularity,
    start: DateLike,
    end: DateLike,
    aggregation?: AggregationType,
  ): Promise<MeterSummary> {
    // todo: cache if endDate < Date.now()
    const values = await this.getMetricScalarValues(
      metric,
      unit,
      start,
      end,
      aggregation,
    );
    return aggregateMeter(values);
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

  getKey(metric: MetricLike, unit?: MetricGranularity): string {
    if (!this.queue) {
      return getHostMetricsKey(this.host, metric, unit);
    }
    return getQueueMetricDataKey(this.queue, metric, unit);
  }

  getHostKey(metric: MetricLike, unit: MetricGranularity): string {
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

function getRangeCacheKey(opts: RangeOpts): string {
  const start = startOf(opts.start, opts.unit).getTime();
  const end = endOf(opts.end, opts.unit).getTime();
  return `${opts.key}:${start}-${end}:${opts.unit}`;
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

export function aggregateSnapshot(data: number[]): StatsSnapshot {
  const sketch = new DDSketch();

  const estimator = new OnlineNormalEstimator();

  data.forEach((x) => {
    sketch.accept(x);
    estimator.add(x);
  });

  const { min, max, count, sum } = sketch;
  const mean = round(count === 0 ? 0 : sum / count, 2);
  const median = Math.ceil(sketch.getValueAtQuantile(0.5) * 100) / 100;

  return {
    count,
    mean,
    sum,
    median,
    stddev: estimator.standardDeviation,
    min,
    max,
    p90: sketch.getValueAtQuantile(0.9),
    p95: sketch.getValueAtQuantile(0.95),
    p99: sketch.getValueAtQuantile(0.99),
    p995: sketch.getValueAtQuantile(0.995),
  };
}
