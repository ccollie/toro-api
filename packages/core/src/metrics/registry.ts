import { Metric } from './metric';
import { MetricType } from './types';
import { MetricName, Tags } from './metric-name';
import { Snapshot } from './snapshot';
import { packageInfo } from '../packageInfo';
import { EventSource } from './events';
import Emittery, { UnsubscribeFn } from 'emittery';
import pSettle from 'p-settle';
import { getAccessor, IAccessorHelper } from '../loaders/accessors';
import LRUCache from 'lru-cache';
import { logger } from '../logger';
import { BiasedQuantileDistribution } from './bqdist';
import { DDSketch } from '@datadog/sketches-js';

export const DEFAULT_PERCENTILES = [0.5, 0.75, 0.9, 0.99];
export const DEFAULT_ERROR = 0.01;
const SNAPSHOT_EVENT = 'METRIC_SNAPSHOT';

export interface BunyanLike {
  error(data: any, text: string): void;
  info(text: string): void;
  trace(text: string): void;
}

export type GetterContext = {
  registry: Registry;
  accessor: IAccessorHelper;
  cache: LRUCache<string, any>;
};

export interface RegistryOptions {
  // default tags to apply to each metric:
  tags?: Tags;

  // default percentiles to track on distributions
  percentiles?: number[];

  // default error to allow on distribution ranks
  error?: number;

  // (msec) how often to send snapshots to observers
  period?: number;

  // (msec) stop reporting counters and distributions that haven't been touched in this long
  expire?: number;
}

/*
 * Coordinator for metrics collection and dispersal within a single namespace.
 * Values are set using a `Metrics` object, and the registry periodically
 * takes a snapshot and posts it to any listeners. (A typical listener might
 * push the metrics into riemann, influxdb, or prometheus.)
 *
 * You would usually not create one of these manually. Instead, you would use
 * `Metrics.create()`, which creates a registry implicitly.
 */
export class Registry {
  // metrics are stored by their "fully-qualified" name, using stringified tags.
  private readonly registry: Map<string, Metric> = new Map();
  private readonly context: GetterContext;
  private readonly emitter: Emittery = new Emittery();

  readonly events: EventSource<Snapshot> = new EventSource<Snapshot>();
  readonly percentiles: number[] = DEFAULT_PERCENTILES;
  readonly error: number = DEFAULT_ERROR;

  readonly version = packageInfo.version;

  currentTime = Date.now();

  period = 60000;
  periodRounding = 1;
  lastPublish = Date.now();

  timer?: NodeJS.Timer;

  constructor(public options: RegistryOptions = {}) {
    if (options.percentiles !== undefined)
      this.percentiles = options.percentiles;
    if (options.error !== undefined) this.error = options.error;
    if (options.period !== undefined) this.period = options.period;

    // if the period is a multiple of minute, 30 sec, 5 sec, or 1 sec, then
    // round the next publish time to that.
    this.periodRounding = 1;
    [60000, 30000, 15000, 10000, 5000, 1000].forEach((r) => {
      if (this.periodRounding == 1 && this.period % r == 0) {
        this.periodRounding = r;
      }
    });

    this.context = {
      registry: this,
      accessor: getAccessor(),
      cache: new LRUCache<string, any>({ stale: false, maxSize: 100 }),
    };

    this.schedulePublish();

    logger.info(`metrics started; period_sec=${this.period / 1000}`);
  }

  getMetrics(): Metric[] {
    return Array.from(this.registry.values());
  }

  get polling(): boolean {
    return !!this.timer;
  }

  start() {
    if (!this.timer) {
      this.schedulePublish();
    }
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private schedulePublish(): void {
    const nextTime =
      Math.round((this.lastPublish + this.period) / this.periodRounding) *
      this.periodRounding;
    let duration = nextTime - Date.now();
    while (duration < 0) duration += this.period;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      this.publish(nextTime)
          .catch(e => logger.error(e));
    }, duration);
    this.timer.unref();
  }

  onSnapshot(handler: (eventData?: Snapshot) => void): UnsubscribeFn {
    return this.emitter.on(SNAPSHOT_EVENT, handler);
  }

  offSnapshot(handler: (eventDate?: Snapshot) => void): void {
    this.emitter.off(SNAPSHOT_EVENT, handler);
  }

  // timestamp is optional. exposed for testing.
  async publish(timestamp?: number): Promise<void> {
    if (timestamp == null) timestamp = Date.now();
    this.currentTime = timestamp;
    if (this.options.expire) {
      for (const [key, metric] of this.registry) {
        if (metric.name.type == MetricType.Gauge) continue;
        if (metric.isExpired(timestamp, this.options.expire))
          this.registry.delete(key);
      }
    }

    const snapshot = await this.snapshot(timestamp);
    this.lastPublish = snapshot.timestamp;

    logger.trace(
      `Publishing ${this.registry.size} metrics to ${this.emitter.listenerCount} observers.`,
    );

    this.events.post(snapshot);

    this.emitter.emit(SNAPSHOT_EVENT, snapshot).catch((e) => {
      logger.error(snapshot, e.message);
    });

    this.schedulePublish();
  }

  async collect(
    timestamp: number = Date.now(),
  ): Promise<Map<MetricName, number | BiasedQuantileDistribution>> {
    const tasks = [];
    const metrics: Metric[] = [];
    const context = this.context;
    const map = new Map<MetricName, number | BiasedQuantileDistribution>();

    function addResult(metric: Metric) {
      if (metric.type === MetricType.Distribution) {
        map.set(metric.name, metric.getDistribution());
      } else {
        map.set(metric.name, metric.getValue());
      }
    }

    for (const metric of this.registry.values()) {
      if (metric.collect) {
        metrics.push(metric);
        tasks.push(() => metric.collect(context, metric, timestamp));
      } else {
        addResult(metric);
      }
    }
    if (tasks.length) {
      const res = await pSettle(tasks, { concurrency: 6 });

      res.forEach((completion, index) => {
        if (completion.isFulfilled) {
          const metric = metrics[index];
          const name = metric.name;
          if (metric.type === MetricType.Distribution) {
            map.set(name, completion.value);
            // todo: metric.capture to add computed metrics
          } else if (metric.type === MetricType.Gauge) {
            metric.setGauge(completion.value);
          } else if (metric.type === MetricType.Counter) {
            metric.increment(completion.value);
          }
          map.set(name, completion.value);
        } else if (completion.isRejected) {
          logger.error(`${completion.reason}`);
        }
      });
    }

    return map;
  }

  /*
   * Return a snapshot of the current value of each metric.
   * Distributions will be reset.
   */
  async snapshot(timestamp: number = Date.now()): Promise<Snapshot> {
    const map = await this.collect(timestamp);
    const distributions = new Map<MetricName, DDSketch>();
    const numerics = new Map<MetricName, number>();
    for (const [mn, value] of map) {
      if (mn.type === MetricType.Distribution) {
        const sketch = (value as BiasedQuantileDistribution).sketch;
        distributions.set(mn, sketch);
        const metric = this.registry.get(mn.canonical);
        if (metric) {
          metric.capture(numerics);
        }
      } else {
        numerics.set(mn, value as number);
      }
    }

    const snapshot = new Snapshot(this, timestamp, numerics);
    snapshot.distributions = distributions;

    return snapshot;
  }

  get(name: MetricName | string): Metric | undefined {
    const needle = typeof name === 'string' ? name : name.canonical;
    return this.registry.get(needle);
  }

  has(name: MetricName): boolean {
    return !!this.get(name);
  }

  addMetric(metric: Metric) {
    if (this.has(metric.name)) {
      throw new Error(
        `A metric with name ${metric.canonicalName} already exists}`,
      );
    }
    this.registry.set(metric.canonicalName, metric);
  }

  getOrMake(name: MetricName): Metric {
    let metric = this.registry.get(name.canonical);
    if (metric === undefined) {
      metric = new Metric(name);
      this.registry.set(name.canonical, metric);
    }
    if (metric.name.type != name.type) {
      throw new Error(
        `${name.name} is already a ${MetricType[metric.name.type]}`,
      );
    }
    return metric;
  }

  remove(name: MetricName) {
    this.registry.delete(name.canonical);
  }
}
