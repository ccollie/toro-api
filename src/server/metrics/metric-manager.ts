import boom from '@hapi/boom';
import { isEmpty, isNil, isNumber, isString } from 'lodash';
import { checkMultiErrors, convertTsForStream, EventBus } from '../redis';
import { getMetricsDataKey, getMetricsKey } from '@lib/keys';

import { Queue, RedisClient } from 'bullmq';
import {
  MetricsEventsEnum,
  SerializedMetric,
  TimeseriesDataPoint,
  Timespan,
} from '../../types';
import { Clock, getUniqueId, nanoid, parseBool } from '../lib';
import { PossibleTimestamp, TimeSeries } from '../commands';
import {
  BaseMetric,
  createMetricFromJSON,
  MetricsListener,
  serializeMetric,
} from './index';
import { QueueListener } from '@server/queues';
import { UnsubscribeFn } from 'emittery';
import { Pipeline } from 'ioredis';

/* eslint @typescript-eslint/no-use-before-define: 0 */

/**
 * Manages the storage of Metric instances related to a queue
 */
export class MetricManager {
  private readonly queue: Queue;
  private readonly queueId: string;
  private readonly bus: EventBus;
  private readonly listener: MetricsListener;
  private readonly clock: Clock;
  private running = false;
  private metricsLoaded = false;

  /**
   * Construct a {@link MetricManager}
   * @param queueId
   * @param listener
   * @param {EventBus} bus queue bus
   */
  constructor(queueId: string, listener: QueueListener, bus: EventBus) {
    this.queue = listener.queue;
    this.queueId = queueId;
    this.bus = bus;
    this.listener = new MetricsListener(listener);
    this.clock = listener.clock;
  }

  destroy(): void {
    //
    this.stop();
    this.listener.destroy();
  }

  async start(): Promise<void> {
    if (!this.running) {
      this.running = true;
      this.listener.clearHandlerMap();
      const metrics = await this.loadMetrics();
      for (const metric of metrics) {
        this.listener.registerMetric(metric);
      }
      this.listener.start();
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this.listener.stop();
    }
  }

  get metrics(): BaseMetric[] {
    return this.listener.metrics;
  }

  get indexKey(): string {
    return getMetricsKey(this.queue, null);
  }

  private getDataKey(metric: BaseMetric | string): string {
    return getMetricsDataKey(this.queue, getMetricId(metric));
  }

  findMetricById(id: string): BaseMetric {
    return this.listener.findMetricById(id);
  }

  async createMetric(opts: SerializedMetric): Promise<BaseMetric> {
    let isNew = false;
    let id = opts.id;
    if (!id) {
      isNew = true;
      const type = opts.type;
      if (type) {
        id = `${nanoid()}`;
      } else {
        id = getUniqueId();
      }
      opts.id = id;
    }
    if (!opts.createdAt) {
      opts.createdAt = this.clock.getTime();
    }
    const key = this.getMetricKey(id);
    const client = await this.getClient();
    if (!isNew) {
      const existing = await client.exists(key);
      if (existing) {
        throw boom.badRequest(
          `A metric with id "${id}" exists in queue "${this.queue.name}"`,
        );
      }
    }
    const metric = createMetricFromJSON(opts, this.clock);
    return this.saveMetric(metric);
  }

  getMetricKey(metric: BaseMetric | string): string {
    return getMetricsKey(this.queue, getMetricId(metric));
  }

  private getClient(): Promise<RedisClient> {
    return this.queue.client;
  }

  /*
   * Fetch a metric by id
   * @param {string} id
   * @returns {Promise<BaseMetric>}
   */
  async getMetric(id: string): Promise<BaseMetric> {
    const client = await this.getClient();
    let metric = this.listener.findMetricById(id);
    if (!metric) {
      const data = await client.hgetall(this.getMetricKey(id));
      if (metric) {
        metric = deserializeMetric(data);
        if (metric) {
          this.listener.registerMetric(metric);
        }
        // else throw
      }
    }
    return metric;
  }

  getMetricByName(name: string): BaseMetric {
    return this.listener.findMetricByName(name);
  }

  /**
   * Update a metric
   * @param {BaseMetric} metric
   * @returns {Promise<BaseMetric>}
   */
  async saveMetric(metric: BaseMetric): Promise<BaseMetric> {
    const isNew = !metric.id;
    const id = isNew ? getUniqueId() : metric.id;
    const key = this.getMetricKey(id);

    if ((metric.name ?? '').trim().length === 0) {
      throw boom.badRequest('A metric must have a name');
    }
    const foundByName = this.getMetricByName(metric.name);

    if (foundByName && foundByName.id !== metric.id) {
      throw boom.badRequest('A metric must have a unique name');
    }

    const client = await this.getClient();

    metric.queueId = this.queueId;
    const data = serializeMetric(metric) as Record<string, any>;
    if (!data.createdAt) {
      data.createdAt = this.clock.getTime();
    }

    data.updatedAt = this.clock.getTime();
    const reply = await client
      .pipeline()
      .exists(key)
      .hget(key, 'isActive')
      .sadd(this.indexKey, id)
      .hmset(key, data)
      .exec()
      .then(checkMultiErrors);

    const exists = reply[0];
    const wasActive = parseBool(reply[1]);
    metric.updatedAt = data.updatedAt;

    const found = this.listener.findMetricById(metric.id);
    // todo: whats the proper way to update ?
    if (!found) {
      this.listener.registerMetric(metric);
    }

    const calls: Array<Promise<void>> = [];

    const eventName = exists
      ? MetricsEventsEnum.METRIC_UPDATED
      : MetricsEventsEnum.METRIC_ADDED;

    calls.push(this.bus.emit(eventName, { metric: metric.toJSON() }));

    if (exists && wasActive !== metric.isActive) {
      const eventName = metric.isActive
        ? MetricsEventsEnum.METRIC_ACTIVATED
        : MetricsEventsEnum.METRIC_DEACTIVATED;

      calls.push(this.bus.emit(eventName, { metricId: id }));
    }

    await Promise.all(calls);

    return metric;
  }

  /**
   * Change a {@link BaseMetric}'s ACTIVE status
   * @param {BaseMetric|string} metric
   * @param {Boolean} isActive
   * @return {Promise<Boolean>}
   */
  async setMetricStatus(
    metric: BaseMetric | string,
    isActive: boolean,
  ): Promise<boolean> {
    const id = getMetricId(metric);
    const key = this.getMetricKey(id);
    const client = await this.getClient();

    const reply = client
      .pipeline()
      .exists(key)
      .hget(key, 'isActive')
      .hset(key, 'isActive', isActive ? 1 : 0)
      .exec()
      .then(checkMultiErrors);

    const exists = reply[0];
    const wasActive = parseBool(reply[1]);
    if (exists) {
      if (wasActive !== isActive) {
        const eventName = isActive
          ? MetricsEventsEnum.METRIC_ACTIVATED
          : MetricsEventsEnum.METRIC_DEACTIVATED;

        await this.bus.emit(eventName, {
          metricId: id,
        });

        const now = this.clock.getTime();
        await client.hset(key, 'updatedAt', now);

        return true;
      }
    } else {
      // oops. remove the hash
      await client.del(key);
      throw boom.notFound(`BaseMetric "${id}" not found`);
    }

    return false;
  }

  // TODO: what to do with rules dependent on the metric ?
  async deleteMetric(metric: BaseMetric | string): Promise<boolean> {
    const metricId = getMetricId(metric);
    const key = this.getMetricKey(metric);
    const dataKey = this.getDataKey(metric);
    const client = await this.getClient();
    const pipeline = client.pipeline();

    pipeline.srem(this.indexKey, metricId);
    const responses = await TimeSeries.multi
      .size(pipeline, dataKey)
      .del(key, dataKey)
      .exec()
      .then(checkMultiErrors);

    const [_, hasAlerts, deleted] = responses;
    if (deleted) {
      const calls: Array<Promise<void>> = [
        this.bus.emit(MetricsEventsEnum.METRIC_DELETED, { metricId }),
      ];
      if (!!hasAlerts) {
        calls.push(
          this.bus.emit(MetricsEventsEnum.METRIC_DATA_CLEARED, { metricId }),
        );
      }
      await Promise.all(calls);
      const toRemove = this.listener.findMetricById(metricId);
      if (toRemove) {
        this.listener.unregisterMetric(toRemove);
      }
    }
    return !!deleted;
  }

  /**
   * Return rules from storage
   * @param {String} sortBy {@link BaseMetric} field to sort by
   * @param {Boolean} asc
   * @return {Promise<[BaseMetric]>}
   */
  async loadMetrics(sortBy = 'createdAt', asc = true): Promise<BaseMetric[]> {
    const metricsKeyPattern = getMetricsKey(this.queue, '*');
    const sortSpec = `${metricsKeyPattern}->${sortBy}`;
    const client = await this.getClient();
    const ids = await client.sort(
      this.indexKey,
      'alpha',
      'by',
      sortSpec,
      asc ? 'asc' : 'desc',
    );
    const pipeline = client.pipeline();
    (ids as string[]).forEach((id) => {
      const key = this.getMetricKey(id);
      pipeline.hgetall(key);
    });

    const result: BaseMetric[] = [];
    const reply = await pipeline.exec().then(checkMultiErrors);
    reply.forEach((resp) => {
      if (resp) {
        try {
          const metric = deserializeMetric(resp);
          if (metric) {
            metric.queueId = this.queueId;
            result.push(metric);
          }
        } catch (err) {
          console.log(err);
        }
      }
    });

    this.metricsLoaded = true;
    return result;
  }

  async addMetricData(
    metric: BaseMetric | string,
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
    metric: BaseMetric | string,
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
    metric: BaseMetric | string,
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
    metric: BaseMetric | string,
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

  async refreshMetricData(
    metric: BaseMetric | string,
    start?: number,
    end?: number,
  ): Promise<void> {
    if (typeof metric === 'string') {
      metric = await this.getMetric(metric);
    }

    return MetricsListener.refreshData(this.queue, metric, start, end);
  }

  async getMetricDateRange(metric: BaseMetric | string): Promise<Timespan> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    return TimeSeries.getTimeSpan(client, key);
  }

  async getMetricDataCount(metric: BaseMetric | string): Promise<number> {
    const client = await this.getClient();
    const key = this.getDataKey(metric);
    return TimeSeries.size(client, key);
  }

  async clearData(metric: BaseMetric | string): Promise<number> {
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
   * @param {BaseMetric|string} metric
   * @param {Number} retention in ms. Alerts before (getTime - retention) will be removed
   * @returns {Promise<Number>}
   */
  async pruneMetricData(
    metric: BaseMetric | string,
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

  onMetricsUpdated(handler: (eventData?: any) => void): UnsubscribeFn {
    return this.listener.onMetricsUpdated(handler);
  }
}

function getMetricId(metric: BaseMetric | string): string {
  let id;
  if (typeof metric === 'string') {
    id = metric;
  } else if (metric.id) {
    id = metric.id;
  }
  if (!id) {
    throw boom.badRequest('Expected a metric or metric id');
  }
  return id;
}

function deserializeObject(str: string): any {
  const empty = Object.create(null);
  if (isNil(str)) return empty;
  try {
    return isString(str) ? JSON.parse(str) : empty;
  } catch {
    // console.log
    return empty;
  }
}

function deserializeMetric(data?: Record<string, any>): BaseMetric {
  if (isEmpty(data)) return null;
  data.options = deserializeObject(data.options);
  return createMetricFromJSON(data);
}
