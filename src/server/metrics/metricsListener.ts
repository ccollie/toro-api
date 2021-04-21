import { default as PQueue } from 'p-queue';
import { JobEventData, QueueListener } from '../queues';
import { BaseMetric, PollingMetric } from './baseMetric';
import Emittery, { UnsubscribeFn } from 'emittery';
import { Clock, logger } from '../lib';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';
import { AccurateInterval, createAccurateInterval } from '../lib';
import { createMetricFromJSON } from '../metrics';
import { SerializedRuleMetric } from '@src/types';

const DEFAULT_CONCURRENCY = 16;
const UPDATE_EVENT_NAME = 'metrics.updated';

const isPollingMetric = (metric: BaseMetric) => metric instanceof PollingMetric;

function GCF(a: number, b: number): number {
  return b === 0 ? a : GCF(b, a % b);
}

interface PollingMetricMetadata {
  lastTick: number;
  interval: number;
}

/***
 * A queue listener that acts as an event emitter/dispatcher for
 * queue metrics. Instead of each metric subscribing to the listener
 * we handle dispatching in a central place. This is backed by a work queue
 * so we don't slow down the reading of events from the queue listener
 * and we also have fine-tuned control over concurrency
 */
export class MetricsListener {
  readonly queueListener: QueueListener;
  protected readonly workQueue: PQueue;
  private readonly _shouldDestroy: boolean;
  private readonly _metrics: BaseMetric[] = [];
  private readonly _pollingMetrics = new Map<
    PollingMetric,
    PollingMetricMetadata
  >();
  private readonly emitter: Emittery = new Emittery();
  private readonly handlerMap = new Map<string, Set<BaseMetric>>();
  private _rateTimer: AccurateInterval;
  private _timerInterval = 0;
  private _state: Record<string, any> = Object.create(null);

  constructor(queueListener: QueueListener, workQueue?: PQueue) {
    this._shouldDestroy = !workQueue;
    this.workQueue =
      workQueue || new PQueue({ concurrency: DEFAULT_CONCURRENCY });
    this.queueListener = queueListener;
    this.onError = this.onError.bind(this);
    this.dispatch = this.dispatch.bind(this);
  }

  private initTimer(): void {
    if (this._pollingMetrics.size === 0) {
      this.stopTimer();
      return;
    }
    const timerInterval = this.calcTimerInterval();
    if (this._timerInterval !== timerInterval) {
      this._timerInterval = timerInterval;
      this.stopTimer();
      this.startTimer();
    }
  }

  private poll(): void {
    const now = Date.now();
    const checked: PollingMetric[] = [];
    const tasks = [];
    this._pollingMetrics.forEach((meta, metric) => {
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
        .then(() => this.emitUpdate(checked))
        .catch(this.onError);
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
  get client(): Promise<IORedis.Redis> {
    return this.queueListener.queue.client;
  }

  private addPollingMetric(metric: PollingMetric): void {
    const meta: PollingMetricMetadata = {
      lastTick: Date.now(),
      interval: metric.interval,
    };
    this._pollingMetrics.set(metric, meta);
    this.initTimer();
  }

  private removePollingMetric(metric: PollingMetric): void {
    const meta = this._pollingMetrics.get(metric);
    if (meta) {
      this._pollingMetrics.delete(metric);
      this.initTimer();
    }
  }

  findMetricById(id: string): BaseMetric {
    return this._metrics.find((x) => x.id === id);
  }

  registerMetricFromJSON(opts: SerializedRuleMetric): BaseMetric {
    let metric = this.findMetricById(opts.id);
    if (!metric) {
      metric = createMetricFromJSON(this.clock, opts);
      this.registerMetric(metric);
    }
    return metric;
  }

  registerMetric(metric: BaseMetric): void {
    if (this._metrics.indexOf(metric) > 0) return;
    metric.validEvents.forEach((event) => {
      let metricsForEvent = this.handlerMap.get(event);
      if (!metricsForEvent) {
        metricsForEvent = new Set<BaseMetric>();
        this.handlerMap.set(event, metricsForEvent);
      }
      metricsForEvent.add(metric);
      if (!this.queueListener.listenerCount(event)) {
        this.queueListener.on(event, this.dispatch);
      }
    });
    this._metrics.push(metric);
    // metric.onUpdate()
    if (isPollingMetric(metric)) {
      this.addPollingMetric(metric as PollingMetric);
    }
    metric.init(this);
  }

  unregisterMetric(metric: BaseMetric): void {
    // todo: metric may possibly be reference by more than one rule
    // use refCounts (see lib/recount-cache)
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
    delete this._state[metric.id];
    const idx = this._metrics.indexOf(metric);
    if (idx >= 0) {
      this._metrics.splice(idx, 1);
      if (isPollingMetric(metric)) {
        this.removePollingMetric(metric as PollingMetric);
      }
    }
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
    this._pollingMetrics.forEach((meta) => {
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
    return val < 1000 ? 1000 : val;
  }

  protected dispatch(event?: JobEventData): void {
    const eventName = `job.${event.event}`;
    const metricsForEvent = this.handlerMap.get(eventName);
    if (metricsForEvent) {
      this.handleEvent(metricsForEvent, event);
    }
  }

  private handleEvent(metrics: Set<BaseMetric>, event: JobEventData): void {
    const tasks = [];
    const filtered: BaseMetric[] = [];
    metrics.forEach((metric: BaseMetric) => {
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

  destroy(): void {
    if (this._shouldDestroy) {
      this.workQueue.clear();
    }
    this.stopTimer();
    this.emitter.clearListeners();
    this.handlerMap.clear();
  }
}
