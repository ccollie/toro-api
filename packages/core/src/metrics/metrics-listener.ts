import { default as PQueue } from 'p-queue';
import { Metric } from './metric';
import Emittery, { UnsubscribeFn } from 'emittery';
import { Queue, RedisClient } from 'bullmq';
import {
  Clock,
  systemClock,
} from '../lib';
import {
  JobEventData,
  JobFinishedEventData,
  QueueListener,
} from '../queues/queue-listener';
import { Events } from './types';
import { roundDown, roundUp } from '@alpen/shared';
import { isAfter } from 'date-fns';
import { logger } from '../logger';

const DEFAULT_CONCURRENCY = 16;
const UPDATE_EVENT_NAME = 'metrics.updated';

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
  private readonly emitter: Emittery = new Emittery();

  constructor(queueListener: QueueListener, workQueue?: PQueue) {
    this._shouldDestroy = !workQueue;
    this.workQueue =
      workQueue || new PQueue({ concurrency: DEFAULT_CONCURRENCY });
    this.queueListener = queueListener;
    this.onError = this.onError.bind(this);
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

  /**
   * Gets a client to the redis instance used by the listener, to be used by
   * any metric that needs it (like RedisMetric). Reuses the queue client
   */
  get client(): Promise<RedisClient> {
    return this.queueListener.queue.client;
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

  onError(err: Error): void {
    logger.warn(err.message || err);
  }

  clear(): void {
    this.emitter.clearListeners();
  }

  destroy(): void {
    if (this._shouldDestroy) {
      this.workQueue.clear();
    }
    this.clear();
  }

  // populate metric data from job event stream
  static async refreshData(
    queue: Queue,
    dispatch: (event: JobEventData, ts?: number, flush?: boolean) => void,
    interval: number,
    start?: number,
    end?: number,
  ): Promise<void> {
    start = Math.max(0, roundDown(start ?? 0, 1000));
    end = roundUp(end || systemClock.getTime(), 1000);

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
    let lastSaved = 0;

    const cancel = () => {
      if (isCancelled) return; // already called
      isCancelled = true;
      clearTimer();
      iterator.return(null).catch((err) => console.log(err));
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
        let now = clock.getTime();
        let shouldFlush = false;
        if (now - lastSaved > interval) {
          now = roundDown(now, interval);
          shouldFlush = true;
        }
        dispatch(event, now, shouldFlush);
        if (count % 25 === 0) {
          await flush();
        }
      }
      await flush(false);
      clearTimer();
      await queueListener.destroy();
    };

    return processEvents();
  }
}
