import Emittery from 'emittery';
import { MetricFamily } from './types';
import { createAsyncIterator, systemClock } from '../lib';
import type { TimeseriesDataPoint } from '../stats';
import {
  Distribution,
  JobNameTagKey,
  MetricName,
  MetricType,
} from './metric-name';
import { BiasedQuantileDistribution } from './bqdist';
import { metricsInfo } from './metrics-info';
import { metricGetters, MetricValueFn } from './metric-getters';

type Value = number | (() => number) | BiasedQuantileDistribution;

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: Metric;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

/*
 * The value stored for a MetricName in a MetricsRegistry, along with its
 * name and last update time.
 */
export class Metric {
  private readonly info: MetricFamily;
  private readonly emitter: Emittery = new Emittery();
  private _prev: number | BiasedQuantileDistribution;

  public id: string;
  public queueId: string;
  public readonly collect: MetricValueFn;
  protected _value: Value;
  public createdAt: number;
  public lastChangedAt: number;

  constructor(public readonly name: MetricName) {
    if (!name) {
      throw new Error('Missing name in metric');
    }
    this._prev = null;
    this.createdAt = systemClock.getTime();
    if (name instanceof Distribution) {
      this._value = new BiasedQuantileDistribution(
        name.percentiles,
        name.error,
      );
    } else {
      this._value = 0;
    }
    this.info = metricsInfo.find((x) => '' + x.type === name.name);
    if (!this.info) {
      throw new Error(`metric "${name.name}" is not recognized`);
    }
    this.collect = metricGetters[this.info.type];
  }

  touch(time: number) {
    this.lastChangedAt = time;
  }

  get canonicalName() {
    return this.name.canonical;
  }

  destroy(): void {
    this.emitter.clearListeners();
  }

  get type(): MetricType {
    return this.name.type;
  }

  get description(): string {
    return this.info.description;
  }

  get unit(): string | undefined {
    return this.info.unit;
  }

  get jobName(): string {
    return this.getTagValue(JobNameTagKey);
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
        if (data.count > 0) {
          for (let i = 0; i < name.percentiles.length; i++) {
            map.set(
              name.percentileGauges[i],
              data.getPercentile(name.percentiles[i]),
            );
          }
          map.set(name.countGauge, data.count);
          map.set(name.sumGauge, data.sum);
        }
        break;
    }
  }
}
