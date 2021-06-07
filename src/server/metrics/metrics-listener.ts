import { default as PQueue } from 'p-queue';
import { JobEventData, QueueListener } from '../queues';
import {
  BaseMetric,
  IPollingMetric,
  isPollingMetric,
  QueueBasedMetric,
} from './baseMetric';
import Emittery, { UnsubscribeFn } from 'emittery';
import { Queue, RedisClient } from 'bullmq';
import {
  Clock,
  AccurateInterval,
  createAccurateInterval,
  logger,
  getMetricsDataKey,
} from '../lib';
import { createMetricFromJSON } from '../metrics';
import { SerializedMetric } from '../../types';
import { TimeSeries } from '../commands';
import ms from 'ms';
import { parseDuration } from '../lib/datetime';

const DEFAULT_CONCURRENCY = 16;
const UPDATE_EVENT_NAME = 'metrics.updated';

function GCF(a: number, b: number): number {
  return b === 0 ? a : GCF(b, a % b);
}

function arrayGCF(...args: number[]): number {
  if (args.length === 0) return 1;
  let gcf = -1;
  args.forEach((value) => {
    if (gcf === -1) {
      gcf = value;
    } else if (gcf > 1) {
      gcf = GCF(gcf, value);
    }
  });
  return gcf;
}

interface MetricMetadata {
  lastTick: number;
  interval: number;
  lastSave: number;
  sampleInterval?: number;
}

const DEFAULT_SAVE_INTERVAL = ms('1 minute');

function getSaveInterval(): number {
  const baseValue = process.env.METRIC_SAVE_INTERVAL;
  return baseValue
    ? parseDuration(baseValue, DEFAULT_SAVE_INTERVAL)
    : DEFAULT_SAVE_INTERVAL;
}

/***
 * A queue listener that acts as an event emitter/dispatcher for
 * queue metrics, as well as storing metric data at a preset interval.
 * Instead of each metric subscribing to the listener
 * we handle dispatching in a central place. This is backed by a work queue
 * so we don't slow down the reading of events from the queue listener
 * and we also have fine-tuned control over concurrency
 */
export class MetricsListener {
  readonly queueListener: QueueListener;
  protected readonly workQueue: PQueue;
  private readonly _shouldDestroy: boolean;
  private readonly _metrics: BaseMetric[] = [];
  private activeMetrics: BaseMetric[] = [];
  private readonly metricMeta = new Map<BaseMetric, MetricMetadata>();
  private readonly pollingMetrics = new Map<IPollingMetric, MetricMetadata>();
  private readonly emitter: Emittery = new Emittery();
  private readonly handlerMap = new Map<string, Set<QueueBasedMetric>>();
  private _saveInterval = getSaveInterval();
  private readonly _state: Record<string, any> = Object.create(null);

  private _rateTimer: AccurateInterval;
  private _saveTimer: AccurateInterval;
  private _timerInterval = 0;
  private running = false;

  constructor(queueListener: QueueListener, workQueue?: PQueue) {
    this._shouldDestroy = !workQueue;
    this.workQueue =
      workQueue || new PQueue({ concurrency: DEFAULT_CONCURRENCY });
    this.queueListener = queueListener;
    this.onError = this.onError.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  public start(): void {
    if (!this.running) {
      this.running = true;
      this.initTimer();
    }
  }

  public stop(): void {
    if (this.running) {
      this.running = false;
      this.stopTimer();
      this.stopSaveTimer();
    }
  }

  private getDataKey(metric: BaseMetric): string {
    return getMetricsDataKey(this.queue, metric.id);
  }

  private updateActive(): BaseMetric[] {
    return (this.activeMetrics = this._metrics.filter((m) => m.isActive));
  }

  private initTimer(): void {
    if (this.pollingMetrics.size === 0) {
      this.stopTimer();
      return;
    }
    const timerInterval = this.calcTimerInterval();
    if (this._timerInterval !== timerInterval) {
      this._timerInterval = timerInterval;
      this.stopTimer();
      this.startTimer();
    }
    if (!this._saveTimer) this.startSaveTimer();
  }

  private poll(): void {
    const now = Date.now();
    const checked: IPollingMetric[] = [];
    const tasks = [];
    this.pollingMetrics.forEach((meta, metric) => {
      const age = now - meta.lastTick;
      if (age >= meta.interval) {
        meta.lastTick = now;
        checked.push(metric);
        tasks.push(() => metric.checkUpdate());
      }
    });
    if (checked.length) {
      this.workQueue
        .addAll(tasks)
        .then(() => this.emitUpdate(checked as unknown as BaseMetric[]))
        .catch(this.onError);
    }
  }

  private async savePoll() {
    const active = this.activeMetrics;
    if (active.length) {
      const now = this.clock.getTime();
      const client = await this.client;
      const pipeline = client.pipeline();

      for (const metric of active) {
        const meta = this.metricMeta.get(metric);
        const age = now - meta.lastSave;
        if (age >= meta.sampleInterval) {
          meta.lastSave = now;
          // todo: round save time to sampleInterval
          const key = this.getDataKey(metric);
          TimeSeries.multi.add(pipeline, key, now, metric.value);
        }
      }

      await pipeline.exec();
    }
  }

  private startSaveTimer(): void {
    if (this._saveTimer) {
      this._saveTimer.stop();
    }
    this._saveInterval = this.calcSaveTimerInterval();
    this._saveTimer = createAccurateInterval(
      () => this.savePoll().catch(this.onError),
      this._saveInterval,
    );
  }

  private stopSaveTimer(): void {
    if (this._saveTimer) {
      this._saveTimer.stop();
      this._saveTimer = null;
    }
  }

  private stopTimer(): void {
    if (this._rateTimer) {
      this._rateTimer.stop();
      this._rateTimer = null;
    }
  }

  private startTimer(): void {
    if (this._rateTimer) {
      this._rateTimer.stop();
    }
    this._rateTimer = createAccurateInterval(
      () => this.poll(),
      this._timerInterval,
    );
  }

  get queue(): Queue {
    return this.queueListener.queue;
  }

  get clock(): Clock {
    return this.queueListener.clock;
  }

  get metrics(): BaseMetric[] {
    return this._metrics;
  }

  /**
   * Gets a client to the redis instance used by the listener, to be used by
   * any metric that needs it (like RedisMetric). Reuses the queue client
   */
  get client(): Promise<RedisClient> {
    return this.queueListener.queue.client;
  }

  private removePollingMetric(metric: IPollingMetric): void {
    const meta = this.pollingMetrics.get(metric);
    if (meta) {
      this.pollingMetrics.delete(metric);
      this.updateActive();
      this.running && this.initTimer();
    }
  }

  findMetricById(id: string): BaseMetric {
    return this._metrics.find((x) => x.id === id);
  }

  findMetricByName(name: string): BaseMetric {
    return this._metrics.find((x) => x.name === name);
  }

  registerMetricFromJSON(opts: SerializedMetric): BaseMetric {
    let metric = this.findMetricById(opts.id);
    if (!metric) {
      metric = createMetricFromJSON(opts, this.clock);
      this.registerMetric(metric);
    }
    return metric;
  }

  registerMetric(metric: BaseMetric): void {
    if (this._metrics.indexOf(metric) > 0) return;
    const meta: MetricMetadata = {
      lastTick: Date.now(),
      lastSave: 0,
      interval: 0,
      sampleInterval: metric.sampleInterval,
    };
    this.metricMeta.set(metric, meta);
    if (isPollingMetric(metric)) {
      meta.interval = metric.interval;
      this.pollingMetrics.set(metric, meta);
    } else if (metric instanceof QueueBasedMetric) {
      metric.validEvents.forEach((event) => {
        let metricsForEvent = this.handlerMap.get(event);
        if (!metricsForEvent) {
          metricsForEvent = new Set<QueueBasedMetric>();
          this.handlerMap.set(event, metricsForEvent);
        }
        metricsForEvent.add(metric);
        if (!this.queueListener.listenerCount(event)) {
          this.queueListener.on(event, this.dispatch);
        }
      });
    }
    this._metrics.push(metric);
    this.updateActive();
    // metric.onUpdate()
    metric.init(this);
    this.running && this.initTimer();
  }

  unregisterMetric(metric: BaseMetric): void {
    // todo: metric may possibly be reference by more than one rule
    // use refCounts (see lib/recount-cache)
    if (metric instanceof QueueBasedMetric) {
      metric.validEvents.forEach((event) => {
        const metricsForEvent = this.handlerMap.get(event);
        if (metricsForEvent) {
          metricsForEvent.delete(metric);
          if (metricsForEvent.size === 0) {
            this.handlerMap.delete(event);
            this.queueListener.off(event, this.dispatch);
          }
        }
      });
    }
    delete this._state[metric.id];
    const idx = this._metrics.indexOf(metric);
    if (idx >= 0) {
      this._metrics.splice(idx, 1);
      this.metricMeta.delete(metric);
      if (isPollingMetric(metric)) {
        this.removePollingMetric(metric);
      }
    }
    this.updateActive();
  }

  on(event: string, handler: (eventData?: any) => void): UnsubscribeFn {
    return this.emitter.on(event, handler);
  }

  onMetricUpdated(
    id: string,
    handler: (eventData?: any) => void,
  ): UnsubscribeFn {
    return this.emitter.on(`${UPDATE_EVENT_NAME}:${id}`, handler);
  }

  offMetricUpdated(id: string, handler: (eventData?: any) => void): void {
    return this.emitter.off(`${UPDATE_EVENT_NAME}:${id}`, handler);
  }

  onMetricsUpdated(handler: (eventData?: any) => void): UnsubscribeFn {
    return this.emitter.on(UPDATE_EVENT_NAME, handler);
  }

  off(event: string, handler: (eventDate?: any) => void): void {
    this.emitter.off(event, handler);
  }

  private calcTimerInterval(): number {
    let val = Number.MAX_VALUE;
    let gcf = -1;
    this.pollingMetrics.forEach((meta) => {
      if (gcf === -1) {
        gcf = meta.interval;
      } else if (gcf > 1) {
        gcf = GCF(gcf, meta.interval);
      }
      if (meta.interval < val) val = meta.interval;
    });
    if (gcf > 1) {
      return gcf;
    }
    return Math.min(1000, val);
  }

  private calcSaveTimerInterval(): number {
    let val = Number.MAX_VALUE;
    let gcf = -1;
    this.metrics.forEach(({ sampleInterval }) => {
      if (gcf === -1) {
        gcf = sampleInterval;
      } else if (gcf > 1) {
        gcf = GCF(gcf, sampleInterval);
      }
      if (sampleInterval < val) val = sampleInterval;
    });
    if (gcf > 1) {
      return gcf;
    }
    return Math.min(1000, val);
  }

  protected dispatch(event?: JobEventData): void {
    const eventName = `job.${event.event}`;
    const metricsForEvent = this.handlerMap.get(eventName);
    if (metricsForEvent) {
      this.handleQueueEvent(metricsForEvent, event);
    }
  }

  private handleQueueEvent(
    metrics: Set<QueueBasedMetric>,
    event: JobEventData,
  ): void {
    const tasks = [];
    const filtered: BaseMetric[] = [];
    metrics.forEach((metric) => {
      if (metric.accept(event)) {
        filtered.push(metric);
        tasks.push(() => metric.handleEvent(event));
      }
    });
    if (!tasks.length) return;
    this.workQueue
      .addAll(tasks)
      .then(() => this.emitUpdate(filtered))
      .catch(this.onError);
  }

  private async emitUpdate(metrics: BaseMetric[]): Promise<void> {
    const state = this._state;
    const calls = [];
    metrics.forEach((metric) => {
      state[metric.id] = metric.value;
      calls.push(() =>
        this.emitter.emit(`${UPDATE_EVENT_NAME}:${metric.id}`, {
          metric,
          state, // pass by ref, so should be fine
        }),
      );
    });
    calls.push(() => this.emitter.emit(UPDATE_EVENT_NAME, { metrics, state }));

    await this.workQueue.addAll(calls);
  }

  onError(err: Error): void {
    logger.warn(err.message || err);
  }

  clear(): void {
    this.emitter.clearListeners();
    this.handlerMap.clear();
  }

  destroy(): void {
    if (this._shouldDestroy) {
      this.workQueue.clear();
    }
    this.stop();
    this.clear();
  }
}
