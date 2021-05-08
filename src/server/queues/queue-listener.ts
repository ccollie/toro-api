import { Queue, QueueEvents, RedisClient } from 'bullmq';
import ms from 'ms';
import LRUCache from 'lru-cache';
import Emittery from 'emittery';
import logger from '../lib/logger';
import { isFinishedStatus, isNumber } from '../lib';
import { parseTimestamp } from '../lib/datetime';
import { parseStreamId, timestampFromStreamId } from '../redis';
import { AppJob, JobStatusEnum } from '../../types';
import {
  systemClock,
  Clock,
  ManualClock,
  createAsyncIterator,
  IteratorOptions,
} from '../lib';

const FINISHED_EVENT = 'job.finished';
const CACHE_TIMEOUT = ms('2 hours');

const DEFAULT_FIELDS_TO_FETCH = [
  'timestamp',
  'processedOn',
  'finishedOn',
  'name',
  'failedReason',
  'attemptsMade',
];

export interface JobEventData {
  prevState?: string;
  ts: number;
  event: string;
  job: Partial<AppJob>;
}

export interface JobFinishedEventData extends JobEventData {
  latency: number;
  wait: number;
  success: boolean;
}

export type JobEventHandler = (
  event?: JobEventData,
  data?: Record<string, any>,
) => void | Promise<void>;

function shouldProxyEvent(eventName: string | symbol): boolean {
  return typeof eventName === 'string' && !eventName.startsWith('job.');
}

/**
 * Listens on a Queue to generate useful events
 * See https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-events.ts
 */
export class QueueListener extends Emittery {
  private readonly cache: LRUCache;
  public readonly queue: Queue;
  private lastStreamId = '$';
  private lastTimestamp = 0;
  private queueEvents: QueueEvents;
  private _listening: boolean;
  private readonly _handlerMap = {};
  private readonly keysToFetch: string[];
  private _client: RedisClient = null;
  private readonly _clock: ManualClock;
  private currentJob: any;
  private eventRefCounts: Record<string, number> = {};

  constructor(queue: Queue) {
    super();
    this.queue = queue;

    this.cache = new LRUCache({
      max: 500,
      maxAge: CACHE_TIMEOUT,
    });

    this._handlerMap = {
      [JobStatusEnum.ACTIVE]: this.makeHandler(
        JobStatusEnum.ACTIVE,
        this.handleActive,
      ),
      [JobStatusEnum.WAITING]: this.makeHandler(
        JobStatusEnum.WAITING,
        this.handleWaiting,
      ),
      [JobStatusEnum.COMPLETED]: this.makeHandler(
        JobStatusEnum.COMPLETED,
        this.handleCompleted,
      ),
      [JobStatusEnum.FAILED]: this.makeHandler(
        JobStatusEnum.FAILED,
        this.handleFailed,
      ),
      [JobStatusEnum.DELAYED]: this.makeHandler(
        JobStatusEnum.DELAYED,
        this.handleDelayed,
      ),
      [JobStatusEnum.STALLED]: this.makeHandler(
        JobStatusEnum.STALLED,
        this.handleStalled,
      ),
      progress: this.makeHandler('progress', this.handleProgress),
      removed: this.makeHandler('removed', this.handleRemoved),
    };

    // proxy events from contained QueueEvents
    this.on(Emittery.listenerAdded, ({ eventName }) => {
      // console.log(eventName);
      if (shouldProxyEvent(eventName)) {
        this.addProxyHandler(String(eventName));
      }
    });

    this.on(Emittery.listenerRemoved, ({ eventName }) => {
      if (shouldProxyEvent(eventName)) {
        this.removeProxyHandler(String(eventName));
      }
    });

    this.keysToFetch = [...DEFAULT_FIELDS_TO_FETCH];
    this._clock = new ManualClock();
  }

  destroy(): Promise<void> {
    this.cache.reset();
    return this.unlisten();
  }

  get isListening(): boolean {
    return !!this._listening;
  }

  get clock(): Clock {
    return this._clock;
  }

  onError(err: Error): void {
    logger.warn(err);
  }

  private addProxyHandler(eventName: string): void {
    // only register a single listener.
    this.eventRefCounts[eventName] = (this.eventRefCounts[eventName] || 0) + 1;
    if (this.listenerCount(eventName)) return;
    // todo: do we need to refcount ????
    if (eventName === 'drained') {
      this.queueEvents.on('drained', (id) => {
        this.emit(eventName, { id }).catch((err) => this.onError(err));
      });
    } else {
      this.queueEvents.on(eventName, (args, id) => {
        this.emit(eventName, { args, id }).catch((err) => this.onError(err));
      });
    }
  }

  private removeProxyHandler(eventName: string): void {
    const refs = (this.eventRefCounts[eventName] =
      (this.eventRefCounts[eventName] || 0) - 1);
    if (refs <= 0) {
      delete this.eventRefCounts[eventName];
      this.clearListeners(eventName);
    }
  }

  private makeHandler(eventName: string, fn: JobEventHandler) {
    const isFinished = isFinishedStatus(eventName);

    fn = fn.bind(this);
    const cache = this.cache;
    const _state =
      eventName === 'progress'
        ? JobStatusEnum.ACTIVE
        : (eventName as JobStatusEnum);

    return async (evt: Record<string, any>, ts: string): Promise<void> => {
      const { jobId } = evt;
      const timestamp = timestampFromStreamId(ts);

      this._clock.set(timestamp);

      let job = cache.get(jobId, !isFinished);
      if (!job) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data, jobId, ...rest } = evt;
        job = rest;
        job.id = jobId;
        cache.set(jobId, job);
      }

      job.state = _state;
      job.prevState = evt.prev;

      this.lastStreamId = ts;
      this.lastTimestamp = timestamp.getTime();

      const evtData: JobEventData = {
        ts: this.lastTimestamp,
        job,
        event: evt.event,
      };

      try {
        await fn(evtData, evt);

        this.currentJob = job;

        if (!isFinished) {
          // todo: use pQueue for these
          await Promise.all([
            this.emit(`job.${eventName}`, evtData),
            this.emit(`job.${jobId}`, evtData),
          ]);
        }

        if (isFinished) {
          // cache.del(jobId);
        }
      } catch (err) {
        console.log(err);
        logger.error(`Error in handler for event: "${eventName}"`, {
          err,
          jobId,
        });
      }
    };
  }

  /**
   * @private
   */
  private handleRemoved(data: JobEventData): void {
    const { job } = data;
    this.cache.del(job.id);
  }

  private handleActive(data: JobEventData, { prev }): void {
    const { job, ts } = data;
    if (!job.timestamp && !prev) {
      job.timestamp = ts;
    }
    job.processedOn = ts;
  }

  private handleCompleted(data: JobEventData, { returnvalue }): any {
    const { job } = data;
    job.returnvalue = returnvalue;
    return this.markFinished(data);
  }

  private handleFailed(data: JobEventData, { failedReason }): any {
    const { job } = data;
    job.failedReason = failedReason;
    return this.markFinished(data);
  }

  private handleWaiting(data: JobEventData): void {
    const { job, ts } = data;
    if (!data.prevState) {
      // we're new
      if (!job.timestamp) {
        job.timestamp = ts;
      }
    } else {
      job.processedOn = ts;
    }

    if (data.prevState === 'delayed') {
      job.delay = 0;
    }
  }

  private handleDelayed(event: JobEventData, { delay }): void {
    const { job } = event;
    if (!event.prevState && !job.timestamp) {
      // we're new
      job.timestamp = event.ts;
    }
    job.delay = parseInt(delay);
  }

  private handleStalled(event: JobEventData): void {
    event.job.isStalled = true;
  }

  private handleProgress(jobData: JobEventData, { data }): void {
    const { job } = jobData;
    job.progress = isNumber(data) ? parseInt(data) : data;
  }

  async markFinished(data: JobEventData): Promise<void> {
    const { job, event, ts } = data;
    const failed = event === 'failed';
    job.state = failed ? JobStatusEnum.FAILED : JobStatusEnum.COMPLETED;
    job.finishedOn = ts;

    const { latency, wait } = await this.getDurations(data);

    return this.emit(FINISHED_EVENT, {
      job,
      ts,
      latency,
      wait,
      success: !failed,
      event: 'finished',
    } as JobFinishedEventData);
  }

  private static needsMeta(data: JobEventData): boolean {
    const { job } = data;
    return (
      job &&
      (!job.timestamp || !job.processedOn || !job.finishedOn || !job.name)
    );
  }

  private async getDurations(
    data: JobEventData,
  ): Promise<{ latency: number; wait: number }> {
    const { job } = data;
    if (QueueListener.needsMeta(data)) {
      // since we're hitting the backend anyway, grab data
      // for other jobs at the same time
      await this.fetchJobData(20, job);
    }
    const finishedOn = job.finishedOn || systemClock.getTime();
    const latency = finishedOn && finishedOn - job.processedOn;
    // TODO: figure out why latency is sometimes negative here
    const wait = job.timestamp && job.processedOn - job.timestamp;
    return {
      latency,
      wait,
    };
  }

  async fetchJobData(count: number, includeJob): Promise<any[]> {
    const jobs = [];
    const client = this._client || (await this.queue.client);
    const pipeline = client.multi();

    const addJob = (job): void => {
      jobs.push(job);
      const key = this.queue.toKey(job.id);
      pipeline.hmget(key, ...this.keysToFetch);
    };

    // Somewhat hacky
    const cacheDump = this.cache.dumpLru();
    for (
      let walker = cacheDump.head;
      walker !== null && jobs.length < count;
      walker = walker.next
    ) {
      const hit = walker.value;
      const item = hit?.value;
      if (QueueListener.needsMeta(item)) {
        addJob(item);
      }
    }

    if (includeJob) {
      addJob(includeJob);
    }

    const response = await pipeline.exec();
    const result = [];
    response.forEach((item, index) => {
      if (item[0]) {
        // err
        return;
      }
      const jobData = item[1];
      if (Array.isArray(jobData) && jobData.length) {
        const [
          timestamp,
          processedOn,
          finishedOn,
          name,
          attemptsMade,
        ] = jobData;
        const job = jobs[index];
        job.timestamp = parseInt(timestamp);
        job.name = name;
        if (processedOn) {
          job.processedOn = parseInt(processedOn);
        }
        if (finishedOn) {
          job.finishedOn = parseInt(finishedOn);
        }
        if (attemptsMade !== undefined) {
          job.attemptsMade = parseInt(attemptsMade, 10);
        }
      }
    });

    return result;
  }

  getCachedJob(id: string): any {
    return this.cache.get(id);
  }

  listen(): Promise<void> {
    return this.startListening();
  }

  unlisten(): Promise<void> {
    if (this._listening || this.queueEvents) {
      this._listening = false;
      return this.queueEvents.close().finally(() => (this.queueEvents = null));
    }
  }

  async startListening(ts = '$'): Promise<void> {
    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }
    const client = await this.queue.client;

    let eventId;

    if (!ts || ts === '$') {
      eventId = '$';
      this.lastTimestamp = systemClock.getTime();
    } else {
      eventId = parseStreamId(ts);
      this.lastTimestamp = parseTimestamp(ts);
    }

    this.queueEvents = new QueueEvents(this.queue.name, {
      lastEventId: eventId,
      connection: client.duplicate(),
    });

    Object.keys(this._handlerMap).forEach((event) => {
      this.queueEvents.on(event, this._handlerMap[event]);
    });

    await this.queueEvents.waitUntilReady();
    this._listening = true;
  }

  createAsyncIterator<T = any, TOutput = T>(
    options: IteratorOptions<any, T, TOutput>,
  ): AsyncIterator<TOutput> {
    return createAsyncIterator<any, T, TOutput>(this, options);
  }
}
