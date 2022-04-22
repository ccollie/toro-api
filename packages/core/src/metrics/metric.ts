import Emittery from 'emittery';
import * as Joi from 'joi';
import { JobEventData } from '../queues';
import { Events, MetricFamily, SerializedMetric } from './types';
import { createAsyncIterator, systemClock } from '../lib';
import type { QueueMetricOptions, Predicate } from '../types';
import { createJobNameFilter } from './utils';
import type { TimeseriesDataPoint } from '../stats';
import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';
import { getMetricsDataKey } from '../keys';
import { Distribution, MetricName, MetricType } from './metric-name';
import { BiasedQuantileDistribution } from './bqdist';
import { metricsInfo } from './metrics-info';

type Value = number | (() => number) | BiasedQuantileDistribution;

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: Metric;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

export const BaseMetricSchema = Joi.object().keys({
  jobNames: Joi.array().items(Joi.string()).single().optional().default([]),
});

export const QueueBasedMetricSchema = BaseMetricSchema;

/*
 * The value stored for a MetricName in a MetricsRegistry, along with its
 * name and last update time.
 */
export class Metric {
  private readonly meta: MetricFamily;
  private readonly emitter: Emittery = new Emittery();
  public id: string;
  public queueId: string;
  protected options: any;
  private _prev: number;
  protected _value: Value;

  public isActive = true;
  public createdAt: number;
  public updatedAt: number;
  public lastChangedAt: number;

  constructor(public readonly name: MetricName, options: unknown) {
    this._prev = null;
    this.setOptions(options);
    this.createdAt = systemClock.getTime();
    this.updatedAt = this.createdAt;
    if (name instanceof Distribution) {
      this._value = new BiasedQuantileDistribution(
        name.percentiles,
        name.error,
      );
    } else {
      this._value = 0;
    }
    this.meta = metricsInfo.find((x) => '' + x.type === name.name);
    if (!this.meta) {
      throw new Error(`metric "${name.name}" is not recognized`);
    }
  }

  touch(time: number) {
    this.lastChangedAt = time;
  }

  get canonicalName() {
    return this.name.canonical;
  }

  validateOptions<T = any>(options: unknown): T {
    const schema = (this.constructor as any).schema;
    if (schema) {
      const { error, value } = schema.validate(options);
      if (error) {
        throw error;
      }
      return value as T;
    }

    return options as T;
  }

  setOptions(options: unknown): void {
    this.options = this.validateOptions(options);
  }

  destroy(): void {
    this.emitter.clearListeners();
  }

  static get schema(): Joi.ObjectSchema {
    return BaseMetricSchema;
  }

  get type(): MetricType {
    return this.name.type;
  }

  get description(): string {
    return this.meta.description;
  }

  get unit(): string | undefined {
    return this.meta.unit;
  }

  getTagValue(key: string): string {
    return this.name.getTagValue(key);
  }

  getNumberTagValue(key: string): number | undefined {
    return this.name.getNumberTagValue(key);
  }

  assertType(type: MetricType) {
    if (this.name.type != type) {
      throw new Error(
        `Metric type mismatch: treating ${MetricType[this.name.type]} as ${
          MetricType[type]
        }`,
      );
    }
  }

  isExpired(timestamp: number, expire: number): boolean {
    return timestamp - this.lastChangedAt >= expire;
  }

  increment(count: number) {
    this.assertType(MetricType.Counter);
    this._value = (this.value as number) + count;
  }

  setGauge(value: number | (() => number)) {
    this.assertType(MetricType.Gauge);
    this._value = value;
  }

  get value(): Value {
    return this._value;
  }

  getValue(): number {
    if (this.value instanceof BiasedQuantileDistribution)
      throw new Error('No single value for distributions.');
    return this.value instanceof Function ? this.value() : this.value;
  }

  getDistribution(): BiasedQuantileDistribution {
    this.assertType(MetricType.Distribution);
    return this.value as BiasedQuantileDistribution;
  }

  onUpdate(listener: MetricUpdateEventHandler): Emittery.UnsubscribeFn {
    return this.emitter.on('update', listener);
  }

  createValueIterator(): AsyncIterator<TimeseriesDataPoint> {
    return createAsyncIterator(this.emitter, {
      eventNames: ['update'],
      transform(_, data: MetricUpdateEvent) {
        return {
          ts: data.ts,
          value: data.value,
        };
      },
    });
  }

  toJSON(): SerializedMetric {
    const { createdAt, updatedAt, isActive, options } = this;
    return {
      id: this.id,
      name: this.name.toJSON(),
      isActive,
      options: {
        ...this.options,
      },
      createdAt,
      updatedAt,
    };
  }

  // To override in descendents
  protected transformValue(value: number, ts?: number): number {
    return value;
  }

  // Public core used elsewhere
  update(value: number, ts?: number): number {
    ts = ts ?? systemClock.getTime();
    this._value = this.transformValue(value, ts);
    if (this._value !== this._prev) {
      this._prev = this._value;
      this.lastChangedAt = ts;
      const event: MetricUpdateEvent = {
        ts,
        value: this._value,
        metric: this,
      };
      this.emitter.emit('update', event).catch((err) => console.log(err));
    }
    return this._value;
  }

  /*
   * store this metric's data into a Map. distributions will store multiple
   * values: one for each requested percentile, and count and sum.
   */
  capture(map: Map<MetricName, number>) {
    switch (this.name.type) {
      case MetricType.Counter:
      case MetricType.Gauge:
        map.set(this.name, this.getValue());
        break;
      case MetricType.Distribution:
        // distributions write multiple values into the snapshot:
        const name = this.name as Distribution;
        const dist = this.getDistribution();
        const data = dist.snapshot();
        dist.reset();
        if (data.sampleCount > 0) {
          for (let i = 0; i < name.percentiles.length; i++) {
            map.set(
              name.percentileGauges[i],
              data.getPercentile(name.percentiles[i]),
            );
          }
          map.set(name.countGauge, data.sampleCount);
          map.set(name.sumGauge, data.sampleSum);
        }
        break;
    }
  }

  protected getDataKey(queue: Queue): string {
    return getMetricsDataKey(queue, this.id);
  }
}

export abstract class QueueBasedMetric extends Metric {
  private _filter: Predicate<string>;
  private _jobNames: string[];

  constructor(options: QueueMetricOptions) {
    super(options);
    this.jobNames = options.jobNames || [];
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  get jobNames(): string[] {
    return this._jobNames;
  }

  set jobNames(values: string[]) {
    this._jobNames = values;
    this._filter = createJobNameFilter(values);
  }

  static get schema(): Joi.ObjectSchema {
    return QueueBasedMetricSchema;
  }

  abstract handleEvent(event?: JobEventData): void;

  accept(event: JobEventData): boolean {
    const name = event.job.name;
    return !name || this._filter(name);
  }
}

export interface IPollingMetric {
  checkUpdate: (pipeline: Pipeline, queue: Queue, ts?: number) => Promise<void>;
}

export function isPollingMetric(arg: any): arg is IPollingMetric {
  return (
    arg &&
    typeof arg.interval === 'number' &&
    typeof arg.checkUpdate === 'function' &&
    arg instanceof Metric
  );
}
