import { default as PQueue } from 'p-queue';
import { Metric, isPollingMetric, QueueBasedMetric } from './metric';
import Emittery, { UnsubscribeFn } from 'emittery';
import { Queue, RedisClient } from 'bullmq';
import {
  Clock,
  AccurateInterval,
  createAccurateInterval,
  systemClock,
} from '../lib';
import {
  QueueListener,
  JobEventData,
  JobFinishedEventData,
} from '../queues/queue-listener';
import { getMetricsDataKey } from '../keys';
import { Events } from './types';
import { createMetricFromJSON } from './factory';
import { TimeSeries } from '../commands';
import IORedis from 'ioredis';
import { roundDown, roundUp } from '@alpen/shared';
import { isAfter } from 'date-fns';
import ms from 'ms';
import { logger } from '../logger';
import { SerializedMetric } from './types';

const MAX_INTERVAL = ms('2d');
const DEFAULT_INTERVAL = ms('1 hr');
const DEFAULT_CONCURRENCY = 16;
const UPDATE_EVENT_NAME = 'metrics.updated';

function GCF(a: number, b: number): number {
  return b === 0 ? a : GCF(b, a % b);
}

interface MetricMetadata {
  lastTick: number;
  interval: number;
  lastSave: number;
  sampleInterval?: number;
}

export interface MetricsUpdatedPayload {
  metrics: Metric[];
  state: Record<string, any>;
  ts: number;
}

/***
 * A queue listener that acts as an event emitter/dispatcher for
 * queue metrics, as well as storing metric data at a preset interval.
 * Instead of each metric subscribing to the listener
 * we handle dispatching in a central place. This is backed by a work queue,
 * so we don't slow down the reading of events from the queue listener,
 * and we also have fine-tuned control over concurrency
 */
export class MetricsListener {
  readonly queueListener: QueueListener;
  protected readonly workQueue: PQueue;
  private readonly _shouldDestroy: boolean;
  private readonly _metrics: Metric[] = [];
  private readonly metricMeta = new Map<Metric, MetricMetadata>();
  private readonly emitter: Emittery = new Emittery();
  private readonly handlerMap = new Map<string, Set<QueueBasedMetric>>();
  private readonly _state: Record<string, any> = Object.create(null);

  private _timer: AccurateInterval;
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

  start(): void {
    if (!this.running) {
      this.running = true;
      this.initTimer();
    }
  }

  stop(): void {
    if (this.running) {
      this.running = false;
      this.stopTimer();
    }
  }

  private getDataKey(metric: Metric): string {
    return getMetricsDataKey(this.queue, metric.id);
  }

  private initTimer(): void {
    const timerInterval = this.calcTimerInterval();
    if (this._timerInterval !== timerInterval) {
      this._timerInterval = timerInterval;
      this.stopTimer();
      this.startTimer();
    }
  }

  saveIfNecessary(
    pipeline: IORedis.Pipeline,
    metric: Metric,
    now?: number,
  ): boolean {
    now = now ?? this.clock.getTime();
    const meta = this.metricMeta.get(metric);
    const age = now - meta.lastSave;
    if (age >= meta.sampleInterval) {
      meta.lastSave = now;
      // todo: round save time to sampleInterval
      const key = this.getDataKey(metric);
      TimeSeries.multi.add(pipeline, key, now, metric.value);
      return true;
    }
    return false;
  }

  private async pollInternal(
    metrics: Metric[],
    pipeline: IORedis.Pipeline,
    now?: number,
  ): Promise<void> {
    now = now ?? this.clock.getTime();
    const tasks = [];
    const polling: Metric[] = [];

    const addToPipeline = (metric: Metric) => {
      // todo: round save time to sampleInterval
      const key = this.getDataKey(metric);
      TimeSeries.multi.add(pipeline, key, now, metric.value);
    };

    for (const metric of metrics) {
      const meta = this.metricMeta.get(metric);
      const age = now - meta.lastSave;
      if (age >= meta.sampleInterval) {
        meta.lastSave = now;
        meta.lastTick = now;
        if (isPollingMetric(metric)) {
          tasks.push(() => metric.checkUpdate(pipeline, this.queue, now));
          polling.push(metric);
        } else {
          addToPipeline(metric);
        }
      }
    }

    if (polling.length) {
      await this.workQueue
        .addAll(tasks)
        .then(() => this.emitUpdate(polling, now))
        .catch(this.onError);

      polling.forEach(addToPipeline);
    }
  }

  private async poll() {
    const active = this.activeMetrics;
    if (active.length) {
      const now = this.clock.getTime();
      const client = await this.client;
      const pipeline = client.pipeline();
      await this.pollInternal(active, pipeline, now);

      if (pipeline.length) {
        await pipeline.exec();
      }
    }
  }

  private stopTimer(): void {
    if (this._timer) {
      this._timer.stop();
      this._timer = null;
    }
  }

  private startTimer(): void {
    if (this._timer) {
      this._timer.stop();
    }

    this._timer = createAccurateInterval(
      () => this.poll(),
      this._timerInterval,
    );

    this._timer.start();
  }

  get queue(): Queue {
    return this.queueListener.queue;
  }

  get clock(): Clock {
    return this.queueListener.clock;
  }

  get metrics(): Metric[] {
    return this._metrics;
  }

  get activeMetrics(): Metric[] {
    return this._metrics.filter((x) => x.isActive);
  }

  /**
   * Gets a client to the redis instance used by the listener, to be used by
   * any metric that needs it (like RedisMetric). Reuses the queue client
   */
  get client(): Promise<RedisClient> {
    return this.queueListener.queue.client;
  }

  async getLastWrite(metric: Metric): Promise<number> {
    const key = this.getDataKey(metric);
    const client = await this.client;
    const span = await TimeSeries.getTimeSpan(client, key);
    return span?.endTime ?? 0;
  }

  findMetricById(id: string): Metric {
    return this._metrics.find((x) => x.id === id);
  }

  findMetricByName(name: string): Metric {
    return this._metrics.find((x) => x.canonicalName === name);
  }

  registerMetricFromJSON(opts: SerializedMetric): Metric {
    let metric = this.findMetricById(opts.id);
    if (!metric) {
      metric = createMetricFromJSON(opts);
      this.registerMetric(metric);
    }
    return metric;
  }

  registerMetric(metric: Metric): void {
    if (this._metrics.indexOf(metric) > 0) return;
    const meta: MetricMetadata = {
      lastTick: Date.now(),
      lastSave: 0,
      interval: 0
    };
    this.metricMeta.set(metric, meta);
    this._metrics.push(metric);
    // metric.onUpdate()
  }

  unregisterMetric(metric: Metric): void {
    delete this._state[metric.id];
    const idx = this._metrics.indexOf(metric);
    if (idx >= 0) {
      this._metrics.splice(idx, 1);
      this.metricMeta.delete(metric);
    }
  }

  on(event: string, handler: (eventData?: any) => void): UnsubscribeFn {
    return this.emitter.on(event, handler);
  }

  onMetricsUpdated(
    handler: (eventData?: MetricsUpdatedPayload) => void,
  ): UnsubscribeFn {
    return this.emitter.on(UPDATE_EVENT_NAME, handler);
  }

  off(event: string, handler: (eventDate?: any) => void): void {
    this.emitter.off(event, handler);
  }

  private calcTimerInterval(): number {
    let val = Number.MAX_SAFE_INTEGER;
    let gcf = -1;
    const active = this.activeMetrics;
    if (!active.length) {
      return DEFAULT_INTERVAL;
    }
    active.forEach(({ sampleInterval }) => {
      if (gcf === -1) {
        gcf = sampleInterval;
      } else if (gcf > 1) {
        gcf = GCF(gcf, sampleInterval);
      }
      val = Math.min(val, sampleInterval);
    });
    if (gcf > 1) {
      return gcf;
    }
    if (val < 1000) val = 1000;
    val = Math.max(val, MAX_INTERVAL);
    return val;
  }

  dispatch(event?: JobEventData): void {
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
    const filtered: Metric[] = [];
    metrics.forEach((metric) => {
      if (metric.accept(event)) {
        filtered.push(metric);
        tasks.push(() => metric.handleEvent(event));
      }
    });
    if (!tasks.length) return;
    this.workQueue
      .addAll(tasks)
      .then(() => this.emitUpdate(filtered, event.ts))
      .catch(this.onError);
  }

  private async emitUpdate(metrics: Metric[], ts: number): Promise<void> {
    const state = this._state;
    const calls = [];
    metrics.forEach((metric) => {
      state[metric.id] = metric.value;
      calls.push(() =>
        this.emitter.emit(`${UPDATE_EVENT_NAME}:${metric.id}`, {
          metric,
          state, // pass by ref, so should be fine
          ts,
        }),
      );
    });
    calls.push(() =>
      this.emitter.emit(UPDATE_EVENT_NAME, { metrics, state, ts }),
    );

    await this.workQueue.addAll(calls);
  }

  onError(err: Error): void {
    logger.warn(err.message || err);
  }

  clear(): void {
    this.emitter.clearListeners();
    this.clearHandlerMap();
  }

  clearHandlerMap(): void {
    this.handlerMap.clear();
  }

  destroy(): void {
    if (this._shouldDestroy) {
      this.workQueue.clear();
    }
    this.clear();
    this.stop();
  }

  // populate metric data from job event stream
  static async refreshData(
    queue: Queue,
    metrics: Metric | Metric[],
    dispatch: (event: JobEventData) => void,
    start?: number,
    end?: number,
  ): Promise<void> {
    start = Math.max(0, roundDown(start ?? 0, 1000));
    end = roundUp(end || systemClock.getTime(), 1000);

    if (!Array.isArray(metrics)) metrics = [metrics];
    const client = await queue.client;

    const TIMEOUT = 15000;

    let timer: ReturnType<typeof setTimeout>;

    function clearTimer(): void {
      if (timer) {
        clearInterval(timer);
      }
    }

    let isCancelled = false;
    let lastSeen: number;
    let iterator: AsyncIterator<JobFinishedEventData>;
    let listener: MetricsListener;
    let lastSaved = 0;

    const cancel = () => {
      if (isCancelled) return; // already called
      isCancelled = true;
      clearTimer();
      iterator.return(null).catch((err) => console.log(err));
      listener.stop();
    };

    const startTimer = (): void => {
      lastSeen = systemClock.getTime();
      timer = setInterval(() => {
        const now = systemClock.getTime();
        if (now - lastSeen > TIMEOUT) {
          logger.warn('[MetricsListener] timed out WAITING for event');
          cancel();
        }
      }, 500);

      timer.unref();
    };

    const processEvents = async (): Promise<void> => {
      const queueListener: QueueListener = new QueueListener(queue);
      await queueListener.startListening(start);

      const clock = queueListener.clock;

      iterator = queueListener.createAsyncIterator<JobFinishedEventData>({
        eventNames: [
          Events.ACTIVE,
          Events.COMPLETED,
          Events.FAILED,
          Events.FINISHED,
        ],
      });

      listener = new MetricsListener(queueListener);

      metrics.forEach((m) => listener.registerMetric(m));
      listener.start();

      const timerInterval = listener.calcTimerInterval();

      const iterable = {
        [Symbol.asyncIterator]: () => iterator,
      };

      let count = 0;
      let pipeline = client.pipeline();

      async function flush(restart = true) {
        if (count) {
          lastSaved = clock.getTime();
          await pipeline.exec();
          if (restart) {
            pipeline = client.pipeline();
          }
          count = 0;
        }
      }

      startTimer();
      for await (const event of iterable) {
        if (!event || isAfter(event.ts, end) || isCancelled) {
          break;
        }
        lastSeen = systemClock.getTime();
        const now = clock.getTime();
        dispatch(event);
        if (lastSaved - now > timerInterval) {
          await listener.pollInternal(metrics, pipeline, now);
        }
        if (count % 25 === 0) {
          await flush();
        }
      }
      await flush(false);
      clearTimer();
      listener.destroy();
      await queueListener.destroy();
    };

    return processEvents();
  }
}
