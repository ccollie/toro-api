import boom, { notFound } from '@hapi/boom';
import { DateLike, isNumber, isObject, safeParse } from '@alpen/shared';
import { checkMultiErrors, convertTsForStream, EventBus } from '../redis';
import { getMetricsDataKey, getMetricsKey } from '../keys';

import { Queue, RedisClient } from 'bullmq';
import { MetricMetadata, MetricsEventsEnum, MetricTypeName } from './types';
import { Clock, systemClock } from '../lib';
import { PossibleTimestamp, TimeSeries, TimeseriesValue } from '../commands';
import { Metric } from './metric';
import { MetricsUpdatedPayload } from './metrics-listener';
import { UnsubscribeFn } from 'emittery';
import { Pipeline } from 'ioredis';
import { StatsGranularity, TimeseriesDataPoint } from '../stats';
import { Metrics } from './metrics';
import {
  Counter as CounterName,
  Distribution as DistributionName,
  Gauge as GaugeName,
  HostTagKey,
  JobNameTagKey,
  MetricName,
  MetricType,
  QueueTagKey,
} from './metric-name';
import { RegistryOptions } from './registry';
import { isHostMetric, MetricLike, getCanonicalName } from './utils';
import { metricsInfo } from './metrics-info';
import { Timespan } from '../types';
import { MetricDataClient } from './metric-data-client';
import { logger } from '../logger';
import { BiasedQuantileDistribution } from './bqdist';
import { DDSketch } from '@datadog/sketches-js';

/* eslint @typescript-eslint/no-use-before-define: 0 */

// todo: pass in default registry options

type MetricManagerOptions = {
  host: string;
  bus: EventBus;
  client: RedisClient;
  registryOptions?: RegistryOptions;
};

/**
 * Manages the storage of Metric instances related to a queue
 */
export class MetricManager {
  private readonly client: RedisClient;
  private readonly queue: Queue;
  private readonly bus: EventBus;
  private readonly clock: Clock;
  private readonly host: string;
  private running = false;
  private metricsLoaded = false;
  private readonly _metrics: Metrics;
  private readonly _metaData = new Map<string, MetricMetadata>();
  readonly dataClient: MetricDataClient;

  /**
   * Construct a {@link MetricManager}
   * @param queue
   * @param options
   */
  constructor(queue: Queue, options: MetricManagerOptions) {
    const { bus, host, client } = options;
    this.queue = queue;
    this.bus = bus;
    this.clock = systemClock;
    this._metrics = Metrics.create(options.registryOptions);
    this.host = host;
    this.dataClient = new MetricDataClient({
      queue,
      host,
      client,
    });
  }

  destroy(): void {
    //
    this.stop();
  }

  async start(): Promise<void> {
    if (!this.running) {
      this.running = true;
      const metrics = await this.loadMetrics();
      this._metrics.addMetrics(metrics);
      this._metrics.registry.start();
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this._metrics.registry.stop();
    }
  }

  get metrics(): Metric[] {
    return this._metrics.registry.getMetrics();
  }

  get indexKey(): string {
    return getMetricsKey(this.queue, null);
  }

  private getDataKey(metric: MetricLike): string {
    return getMetricsDataKey(this.queue, getCanonicalName(metric));
  }

  findMetricById(id: string): Metric {
    return this.metrics.find((x) => x.id === id);
  }

  getMetricKey(metric: MetricLike): string {
    return getMetricsKey(this.queue, getCanonicalName(metric));
  }

  private getClient(): Promise<RedisClient> {
    return this.queue.client;
  }

  private deserializeMetric(
    name: string | null,
    value: string | null,
  ): { metric?: Metric; meta?: MetricMetadata } {
    let metric: Metric;

    if (name) {
      const metricName = MetricName.fromCanonicalName(name); // todo: try catch
      metric = new Metric(metricName);
    }

    let meta: MetricMetadata;
    if (value) {
      const v = safeParse(value);
      if (isObject(v)) {
        meta = v as MetricMetadata;
      } else {
        meta = {
          createdAt: this.clock.getTime(),
        };
      }
    }

    return { metric, meta };
  }

  /*
   * Fetch a metric by id
   * @param {string} id
   * @returns {Promise<Metric>}
   */
  async getMetric(id: string | MetricName): Promise<Metric | null> {
    const client = this.client;
    const canonical = getCanonicalName(id);
    let metric = this.metrics.find((m) => m.canonicalName === canonical);
    if (!metric) {
      const data = await client.hget(this.indexKey, canonical);
      if (data) {
        const { metric: _metric, meta: _meta } = this.deserializeMetric(
          canonical,
          data,
        );
        metric = _metric ?? null;
        if (metric) {
          this._metrics.addMetrics(metric);
          if (_meta) {
            this._metaData.set(metric.canonicalName, _meta);
          }
        }
      } else {
        metric = null;
      }
    }
    return metric;
  }

  createMetricName(type: MetricTypeName, jobName?: string): MetricName {
    const queue = this.queue;
    const tags = new Map<string, string>();

    tags.set(HostTagKey, this.host);
    if (jobName) {
      tags.set(JobNameTagKey, jobName);
    }

    if (!isHostMetric(type)) {
      const queueName = queue.name; // todo: use prefix ?
      tags.set(QueueTagKey, queueName);
    }
    const info = metricsInfo.find((m) => m.type === type);
    const {
      tags: baseTags,
      percentiles,
      error,
    } = this._metrics.registry.options;

    let mn: MetricName;
    if (info.metricType === MetricType.Counter) {
      mn = new CounterName(type, baseTags, tags);
    } else if (info.metricType === MetricType.Gauge) {
      mn = new GaugeName(type, baseTags, tags);
    } else {
      mn = new DistributionName(type, baseTags, tags, percentiles, error);
    }

    return mn;
  }

  async createMetric(type: MetricTypeName): Promise<Metric> {
    const mn = this.createMetricName(type);
    if (this._metrics.get(mn)) {
      throw boom.badRequest(
        `Metric ${type} already exists in queue ${this.queue.name}`,
      );
    }
    const metric = new Metric(mn);
    return this.saveMetric(metric);
  }

  /**
   * Update a metric
   * @param {Metric} metric
   * @returns {Promise<Metric>}
   */
  async saveMetric(metric: Metric): Promise<Metric> {
    const id = metric.canonicalName;
    const key = this.indexKey;

    const meta: MetricMetadata = {
      createdAt: this.clock.getTime(),
    };

    let strMeta = JSON.stringify(meta);

    const reply = await this.client
      .pipeline()
      .hsetnx(key, id, strMeta)
      .hget(key, id)
      .exec()
      .then(checkMultiErrors);

    const exists = reply[0] === 0;
    strMeta = reply[1];

    if (strMeta) {
      const val = safeParse(strMeta);
      // todo. Do this in lua
      if (typeof val === 'object') {
        const meta = val as MetricMetadata;
        this._metaData.set(id, meta);
      }
    }

    const found = this._metrics.get(id);
    // todo: what's the proper way to update ?
    if (!found) {
      this._metrics.addMetrics([metric]);
    }

    if (!exists) {
      // todo: put this on workQueue as its non-critical
      await this.bus.emit(MetricsEventsEnum.METRIC_ADDED, {
        canonicalName: metric.canonicalName,
      });
    }

    return metric;
  }

  /**
   * Set/update the metadata associated with a {@link Metric}'s
   * @param {Metric|string} metric
   * @param {MetricMetadata} meta the new metadata value
   * @param action determines how to update the metadata
   * @return {Promise<MetricMetadata>}
   */
  async setMetricMeta(
    metric: MetricLike,
    meta: MetricMetadata,
    action: 'replace' | 'merge' = 'merge',
  ): Promise<MetricMetadata> {
    const canonical = getCanonicalName(metric);
    const client = await this.getClient();

    const _metric = await this.getMetric(canonical);
    if (!_metric) {
      throw notFound(`Metric "${canonical}" not found`);
    }

    const key = this.indexKey;

    let updated: MetricMetadata;
    if (action === 'replace') {
      const str = JSON.stringify(meta);
      updated = meta;
      await client.hset(key, canonical, str);
    } else {
      const saved = await client.hget(key, canonical);
      if (saved) {
        const value = safeParse(saved);
        // todo. Do this in lua
        if (typeof value === 'object') {
          updated = {
            ...value,
            ...meta,
          } as MetricMetadata;
          await client.hset(key, canonical, JSON.stringify(updated));
        }
      } else {
        updated = meta;
      }
    }

    this._metaData.set(canonical, updated);

    return updated;
  }

  // TODO: what to do with rules dependent on the metric ?
  async deleteMetric(metric: MetricLike): Promise<boolean> {
    const canonicalName = getCanonicalName(metric);
    const pipeline = this.dataClient.pipeline;

    pipeline.hdel(this.indexKey, canonicalName);
    this._metaData.delete(canonicalName);
    const found = this.metrics.find((m) => m.canonicalName === canonicalName);
    if (found) {
      this._metrics.remove(found.name);
    }
    this.dataClient.pipelineDeleteMetric(metric);

    const responses = await this.dataClient.flush();

    const deleted = responses[0];
    if (deleted) {
      // todo: place on worker queue. Not critical
      this.bus
        .emit(MetricsEventsEnum.METRIC_DELETED, { canonicalName })
        .catch((e) => logger.warn(e));
    }
    return !!deleted;
  }

  /**
   * Return rules from storage
   * @return {Promise<[Metric]>}
   */
  async loadMetrics(): Promise<Metric[]> {
    const items = await this.client.hgetall(this.indexKey);

    const result: Metric[] = [];
    for (const [key, value] of Object.entries(items)) {
      const name = MetricName.fromCanonicalName(key); // todo: try catch
      const metric = new Metric(name);

      result.push(metric);
      if (value) {
        const v = safeParse(value);
        let meta: MetricMetadata;
        if (isObject(v)) {
          meta = v as MetricMetadata;
        } else {
          meta = {
            createdAt: this.clock.getTime(),
          };
        }
        this._metaData.set(name.canonical, meta);
      }
    }

    this.metricsLoaded = true;
    return result;
  }

  async addMetricData(
    metric: MetricLike,
    unit: StatsGranularity,
    timestamp: number,
    value: number,
  ): Promise<void> {
    await this.dataClient.add(metric, unit, timestamp, value);
  }

  async addDistributionData(
    metric: MetricLike,
    unit: StatsGranularity,
    timestamp: DateLike,
    value: BiasedQuantileDistribution,
  ): Promise<void> {
    await this.dataClient.addDistribution(metric, unit, timestamp, value);
  }

  pipelineGetMetricData(
    pipeline: Pipeline,
    metric: MetricLike,
    unit: StatsGranularity,
    start: PossibleTimestamp = '-',
    end: PossibleTimestamp = '+',
  ): Pipeline {
    const key = this.getDataKey(metric);
    start = convertTsForStream(start);
    end = convertTsForStream(end);
    const rest = [];
    TimeSeries.multi.getRange(pipeline, key, start, end, ...rest);
    return pipeline;
  }

  async getMetricData(
    metric: Metric | string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesDataPoint[]> {
    const data = await this.dataClient.getNumericRange(
      metric,
      unit,
      start,
      end,
    );

    return data.map((x) => ({
      ts: x.timestamp,
      value: x.value,
    }));
  }

  async getDistributionRange(
    metric: MetricLike,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<TimeseriesValue<DDSketch>[]> {
    return this.dataClient.getDistributionRange(metric, unit, start, end);
  }

  async getMetricDateRange(
    metric: MetricLike,
    unit = StatsGranularity.Minute,
  ): Promise<Timespan> {
    const meta = await this.dataClient.getMetadata(metric, unit);
    if (!meta) return null;
    return {
      startTime: meta.firstTS,
      endTime: meta.lastTS,
    };
  }

  async getMetricDataCount(metric: MetricLike): Promise<number> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    return TimeSeries.size(client, key);
  }

  async clearData(metric: MetricLike): Promise<number> {
    const canonicalName = getCanonicalName(metric);
    const count = await this.getMetricDataCount(metric);
    this.dataClient.pipelineDeleteMetric(metric);
    await this.dataClient.flush();
    await this.bus.emit(MetricsEventsEnum.METRIC_DATA_CLEARED, {
      canonicalName,
    });
    return isNumber(count) ? count : 0;
  }

  /**
   * Prune data according to a retention duration
   * @param {Metric|string} metric
   * @returns {Promise<void>}
   */
  async pruneMetricData(metric: Metric | string): Promise<void> {
    // TODO: raise event
    this.dataClient.pipelinePrune(metric);
    await this.dataClient.flush();
  }

  async pruneData(): Promise<void> {
    for (const metric of this.metrics) {
      this.dataClient.pipelinePrune(metric);
    }
    await this.dataClient.flush();
  }

  onMetricsUpdated(
    handler: (eventData?: MetricsUpdatedPayload) => void,
  ): UnsubscribeFn {
    throw boom.notImplemented('onMetricsUpdated');
  }
}
