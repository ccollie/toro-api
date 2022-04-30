import Emittery from 'emittery';
import { MetricFamily, MetricType } from './types';
import { systemClock } from '../lib';
import { Distribution, JobNameTagKey, MetricName } from './metric-name';
import { BiasedQuantileDistribution } from './bqdist';
import { metricsInfo, MetricAggregateByType } from './metrics-info';
import { metricGetters, MetricValueFn } from './metric-getters';
import { AggregationType } from './aggregators/aggregation';

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
  protected _value: Value;

  public id: string;
  public readonly collect: MetricValueFn;
  public createdAt: number;
  public lastWritten: number;
  public lastChangedAt: number;

  constructor(public readonly name: MetricName) {
    if (!name) {
      throw new Error('Missing name in metric');
    }
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

  aggregationTypes(): AggregationType[] {
    return MetricAggregateByType[this.type];
  }

  get defaultAggregation(): AggregationType {
    return this.name.defaultAggregation;
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
