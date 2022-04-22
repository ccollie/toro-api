import { BiasedQuantileDistribution } from './bqdist';
import { Distribution, MetricName, MetricType } from './metric-name';

type Value = number | (() => number) | BiasedQuantileDistribution;

/*
 * The value stored for a MetricName in a MetricsRegistry, along with its
 * name and last update time.
 */
export class Metric {
  private lastUpdated = 0;
  private value: Value;

  constructor(public name: MetricName) {
    if (name instanceof Distribution) {
      this.value = new BiasedQuantileDistribution(name.percentiles, name.error);
    } else {
      this.value = 0;
    }
  }

  get canonicalName(): string {
    return this.name.canonical;
  }

  get type(): MetricType {
    return this.name.type;
  }

  touch(time: number) {
    this.lastUpdated = time;
  }

  isExpired(timestamp: number, expire: number): boolean {
    return timestamp - this.lastUpdated >= expire;
  }

  increment(count: number) {
    this.assertType(MetricType.Counter);
    this.value = (this.value as number) + count;
  }

  getValue(): number {
    if (this.value instanceof BiasedQuantileDistribution)
      throw new Error('No single value for distributions.');
    return this.value instanceof Function ? this.value() : this.value;
  }

  setGauge(value: number | (() => number)) {
    this.assertType(MetricType.Gauge);
    this.value = value;
  }

  getDistribution(): BiasedQuantileDistribution {
    this.assertType(MetricType.Distribution);
    return this.value as BiasedQuantileDistribution;
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
}
