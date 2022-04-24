import boom, { badRequest, notFound } from '@hapi/boom';
import { isNumber, isObject, safeParse } from '@alpen/shared';
import { checkMultiErrors, convertTsForStream, EventBus } from '../redis';
import { getMetricsDataKey, getMetricsKey } from '../keys';

import { Queue, RedisClient } from 'bullmq';
import { MetricsEventsEnum, Timespan } from '../types';
import { Clock, systemClock } from '../lib';
import { PossibleTimestamp, TimeSeries } from '../commands';
import { Metric } from './metric';
import { MetricsUpdatedPayload } from './metrics-listener';
import { UnsubscribeFn } from 'emittery';
import { Pipeline } from 'ioredis';
import { TimeseriesDataPoint } from '../stats';
import { MetricMetadata, MetricTypeName } from './types';
import { Metrics } from './metrics';
import {
  Counter as CounterName,
  Distribution as DistributionName,
  Gauge as GaugeName,
  MetricName,
  MetricType,
    HostTagKey,
  QueueTagKey,
} from './metric-name';
import { RegistryOptions } from './registry';
import { isHostMetric } from './utils';
import { metricsInfo } from './metrics-info';

/* eslint @typescript-eslint/no-use-before-define: 0 */

type MetricLike = Metric | MetricName | string;

// todo: pass in default registry options

type MetricManagerOptions = {
  host: string;
  bus: EventBus;
  registryOptions?: RegistryOptions;
};

/**
 * Manages the storage of Metric instances related to a queue
 */
export class MetricManager {
  private readonly queue: Queue;
  private readonly bus: EventBus;
  private readonly clock: Clock;
  private readonly host: string;
  private running = false;
  private metricsLoaded = false;
  private readonly _metrics: Metrics;
  private readonly _metaData = new Map<string, MetricMetadata>();

  /**
   * Construct a {@link MetricManager}
   * @param queue
   * @param options
   */
  constructor(queue: Queue, options: MetricManagerOptions) {
    this.queue = queue;
    this.bus = options.bus;
    this.clock = systemClock;
    this._metrics = Metrics.create(options.registryOptions);
    this.host = options.host;
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

  getMetricKey(metric: Metric | string): string {
    return getMetricsKey(this.queue, getMetricId(metric));
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
    const client = await this.getClient();
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

  async createMetric(type: MetricTypeName): Promise<Metric> {
    const queue = this.queue;
    const tags = new Map<string, string>();

    tags.set(HostTagKey, this.host);
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
    if (this._metrics.get(mn)) {
      throw boom.badRequest(
        `Metric ${type} already exists in queue ${queue.name}`,
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

    const client = await this.getClient();
    const meta: MetricMetadata = {
      createdAt: this.clock.getTime(),
    };

    let strMeta = JSON.stringify(meta);

    const reply = await client
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
        metric: metric.toJSON(),
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
    const key = canonicalName;
    const dataKey = this.getDataKey(metric);
    const client = await this.getClient();
    const pipeline = client.pipeline();

    pipeline.hdel(this.indexKey, canonicalName);
    this._metaData.delete(canonicalName);
    const found = this.metrics.find((m) => m.canonicalName === canonicalName);
    if (found) {
      this._metrics.remove(found.name);
    }

    const responses = await TimeSeries.multi
      .size(pipeline, dataKey)
      .del(key, dataKey)
      .exec()
      .then(checkMultiErrors);

    const [_, hasAlerts, deleted] = responses;
    if (deleted) {
      const calls: Array<Promise<void>> = [
        this.bus.emit(MetricsEventsEnum.METRIC_DELETED, { canonicalName }),
      ];
      if (!!hasAlerts) {
        calls.push(
          this.bus.emit(MetricsEventsEnum.METRIC_DATA_CLEARED, {
            canonicalName,
          }),
        );
      }
      await Promise.all(calls);
    }
    return !!deleted;
  }

  /**
   * Return rules from storage
   * @return {Promise<[Metric]>}
   */
  async loadMetrics(): Promise<Metric[]> {
    const client = await this.getClient();
    const items = await client.hgetall(this.indexKey);

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
    metric: Metric | string,
    value: number,
    timestamp?: number,
  ): Promise<void> {
    const key = this.getDataKey(metric);
    const client = await this.getClient();
    const strValue = JSON.stringify(value);
    timestamp = timestamp ?? this.clock.getTime();
    await TimeSeries.add(client, key, timestamp, strValue);
  }

  private getMetricDataArgs(
    metric: Metric | string,
    start: PossibleTimestamp = '-',
    end: PossibleTimestamp = '+',
    limit?: number,
  ): Array<string | number> {
    const key = this.getDataKey(metric);

    start = convertTsForStream(start);
    end = convertTsForStream(end);

    const rest: Array<string | number> = [key, start, end];
    if (typeof limit === 'number') {
      rest.push(0, limit);
    }

    return rest;
  }

  pipelineGetMetricData(
    pipeline: Pipeline,
    metric: Metric | string,
    start: PossibleTimestamp = '-',
    end: PossibleTimestamp = '+',
    limit?: number,
  ): Pipeline {
    const key = this.getDataKey(metric);
    start = convertTsForStream(start);
    end = convertTsForStream(end);

    const rest = [];
    if (typeof limit === 'number') {
      rest.push(0, limit);
    }
    TimeSeries.multi.getRange(pipeline, key, start, end, ...rest);
    return pipeline;
  }

  async getMetricData(
    metric: Metric | string,
    start: PossibleTimestamp = '-',
    end: PossibleTimestamp = '+',
    limit?: number,
  ): Promise<TimeseriesDataPoint[]> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);

    start = convertTsForStream(start);
    end = convertTsForStream(end);

    const rest = [];
    if (typeof limit === 'number') {
      rest.push(0, limit);
    }
    const data = await TimeSeries.getRange<number>(
      client,
      key,
      start,
      end,
      ...rest,
    );

    return data.map((x) => ({
      ts: parseInt(x.timestamp),
      value: x.value,
    }));
  }

  async getMetricDateRange(metric: Metric | string): Promise<Timespan> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getMetricDataCount(metric: Metric | string): Promise<number> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    return TimeSeries.size(client, key);
  }

  async clearData(metric: Metric | string): Promise<number> {
    const count = await this.getMetricDataCount(metric);
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    await client.del(key);
    await this.bus.emit(MetricsEventsEnum.METRIC_DATA_CLEARED, {
      metricId: getMetricId(metric),
    });
    return isNumber(count) ? count : 0;
  }

  /**
   * Prune data according to a retention duration
   * @param {Metric|string} metric
   * @param {Number} retention in ms. Alerts before (getTime - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneMetricData(
    metric: Metric | string,
    retention: number,
  ): Promise<number> {
    // TODO: raise event
    const client = await this.getClient();
    const dataKey = this.getDataKey(metric);
    return TimeSeries.truncate(client, dataKey, retention);
  }

  async pruneData(retention: number): Promise<void> {
    const client = await this.getClient();
    const pipeline = client.pipeline();
    for (const metric of this.metrics) {
      const dataKey = this.getDataKey(metric);
      TimeSeries.multi.truncate(pipeline, dataKey, retention);
    }
    if (this.metrics.length) {
      await pipeline.exec();
    }
  }

  async getMetricIds(): Promise<string[]> {
    const client = await this.getClient();
    return client.smembers(this.indexKey);
  }

  onMetricsUpdated(
    handler: (eventData?: MetricsUpdatedPayload) => void,
  ): UnsubscribeFn {
    throw boom.notImplemented('onMetricsUpdated');
  }
}

function getMetricId(metric: Metric | string): string {
  let id;
  if (typeof metric === 'string') {
    id = metric;
  } else if (metric.id) {
    id = metric.id;
  }
  if (!id) {
    throw badRequest('Expected a metric or metric id');
  }
  return id;
}

function getCanonicalName(metric: MetricLike): string {
  if (typeof metric === 'string') return metric;
  if (metric instanceof Metric) return metric.canonicalName;
  return metric.canonical;
}
