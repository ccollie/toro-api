import { EventSource } from './events';
import {
  Counter,
  Distribution,
  Gauge,
  MetricName,
  MetricType,
  NoTags,
  Tags,
  tagsToMap,
} from './metric-name';
import { Registry, RegistryOptions } from './registry';
import { Snapshot } from './snapshot';
import { performance } from 'perf_hooks';
import {DistributionMetricTypeNames, MetricAggregate, MetricTypeName} from './types';
import { Metric } from './metric';

export const AggregateByType: Record<MetricType, MetricAggregate[]> = {
  [MetricType.Counter]: ['sum'],
  [MetricType.Gauge]: [ 'latest', 'min', 'max', 'sum', 'count', 'average' ],
  [MetricType.Distribution]: [
    'min', 'max', 'sum', 'count', 'average' // todo: percentiles
  ]
};

/*
 * Primary entry point for metrics: Create counters, gauges, and distributions,
 * and manipulate them.
 */
export class Metrics {
  readonly events: EventSource<Snapshot>;

  // internal constructor
  constructor(
    public registry: Registry,
    public prefix: string = '',
    public tags: Tags = NoTags,
  ) {
    this.events = registry.events;
  }

  /*
   * Create a new registry for metrics, and return an object that can be
   * used to create and modify them.
   */
  static create(options: RegistryOptions = {}): Metrics {
    return new Metrics(new Registry(options), '', options.tags);
  }

  /*
   * Create a counter with the given name and optional tags.
   */
  counter(
    name: string | MetricTypeName,
    tags: Tags = NoTags,
    fieldName?: string,
  ): Counter {
    const rv = new Counter(this.prefix + name, this.tags, tags, fieldName);
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Create a gauge with the given name and optional tags.
   */
  gauge(
    name: string | MetricTypeName,
    tags: Tags = NoTags,
    fieldName?: string,
  ): Gauge {
    const rv = new Gauge(this.prefix + name, this.tags, tags, fieldName);
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Create a distribution with the given name and optional tags.
   */
  distribution(
    name: string | DistributionMetricTypeNames,
    tags: Tags = NoTags,
    percentiles: number[] = this.registry.percentiles,
    error: number = this.registry.error,
    fieldName?: string,
  ): Distribution {
    const rv = new Distribution(
      this.prefix + name,
      this.tags,
      tags,
      percentiles,
      error,
      fieldName,
    );
    this.registry.getOrMake(rv);
    return rv;
  }

  /*
   * Increment a counter.
   */
  increment(name: Counter, count = 1) {
    const metric = this.registry.getOrMake(name);
    metric.increment(count);
    metric.touch(this.registry.currentTime);
  }

  /*
   * Get the current value of a counter.
   */
  getCounter(name: Counter): number {
    return this.registry.getOrMake(name).getValue();
  }

  /*
   * Add (or replace) a gauge with the given name.
   * The getter is normally a function that computes the value on demand,
   * but if the value changes rarely or never, you may use a constant value
   * instead.
   */
  setGauge(name: Gauge, getter: number | (() => number)) {
    this.registry.getOrMake(name).setGauge(getter);
  }

  /*
   * Remove a gauge.
   */
  removeGauge(name: Gauge) {
    const metric = this.registry.get(name);
    if (metric === undefined)
      throw new Error('No such gauge: ' + name.canonical);
    metric.assertType(MetricType.Gauge);
    this.registry.remove(name);
  }

  get(name: MetricName | string): Metric {
    return this.registry.get(name);
  }

  remove(name: MetricName): void {
    this.registry.remove(name);
  }

  /*
   * Add a data point (or array of data points) to a distribution.
   */
  addDistribution(name: Distribution, data: number | number[]) {
    const metric = this.registry.getOrMake(name);
    const distribution = metric.getDistribution();
    if (Array.isArray(data)) {
      data.forEach((x) => distribution.record(x));
    } else {
      distribution.record(data);
    }
    metric.touch(this.registry.currentTime);
  }

  addMetrics(metric: Metric | Metric[]): void {
    const arr = Array.isArray(metric) ? metric : [metric];
    arr.forEach((item) => {
      if (!this.registry.has(item.name)) {
        this.registry.addMetric(item);
      }
    });
  }

  /*
   * Time a function call (in milliseconds) and record it as a data point in
   * a distribution. Exceptions are not recorded.
   */
  time<A>(name: Distribution, f: () => A): A {
    const startTime = Date.now();
    const rv = f();
    this.addDistribution(name, Date.now() - startTime);
    return rv;
  }

  /*
   * Time a function call that returns a promise (in milliseconds) and
   * record it as a data point in a distribution. Rejected promises are not
   * recorded.
   */
  timePromise<A>(name: Distribution, f: () => Promise<A>): Promise<A> {
    const startTime = Date.now();
    return f().then((rv) => {
      this.addDistribution(name, Date.now() - startTime);
      return rv;
    });
  }

  /*
   * Time a function call (in microseconds) and record it as a data point in
   * a distribution. Exceptions are not recorded.
   */
  timeMicro<A>(name: Distribution, f: () => A): A {
    const startTime = performance.now();
    const rv = f();
    this.addDistribution(name, performance.now() - startTime);
    return rv;
  }

  /*
   * Time a function call that returns a promise (in microseconds) and
   * record it as a data point in a distribution. Rejected promises are not
   * recorded.
   */
  timeMicroPromise<A>(name: Distribution, f: () => Promise<A>): Promise<A> {
    const startTime = performance.now();
    return f().then((rv) => {
      this.addDistribution(name, performance.now() - startTime);
      return rv;
    });
  }

  /*
   * Return a new Metrics object that represents the same registry, but
   * adds this prefix to all names. This call can be used multiple times, to
   * build nested prefixes:
   *
   *     m.withPrefix("a_").withPrefix("b_") == m.withPrefix("a_b_")
   */
  withPrefix(prefix: string): Metrics {
    return new Metrics(this.registry, this.prefix + prefix, this.tags);
  }

  /*
   * Return a new Metrics object that represents the same registry, with an
   * extra set of default tags.
   */
  withTags(tags: Tags): Metrics {
    return new Metrics(this.registry, this.prefix, tagsToMap(this.tags, tags));
  }
}
