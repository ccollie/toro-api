import { parseTimestamp } from '@alpen/shared';
import { Queue, QueueEvents, RedisClient } from 'bullmq';
import type { JobJsonRaw, QueueEventsListener } from 'bullmq';
import Emittery from 'emittery';
import LRUCache from 'lru-cache';
import ms from 'ms';
import {
  Clock,
  createAsyncIterator,
  IteratorOptions,
  ManualClock,
  systemClock,
} from '../lib';
import { logger } from '../logger';
import { parseStreamId, timestampFromStreamId } from '../redis';
import type { AppJob } from '../types';

export const Events = {
  FINISHED: 'job.finished',
  COMPLETED: 'job.completed',
  FAILED: 'job.failed',
  PROGRESS: 'job.progress',
  ACTIVE: 'job.active',
  DELAYED: 'job.delayed',
  STALLED: 'job.stalled',
};

export const FINISHED_EVENT = 'job.finished';
const CACHE_TIMEOUT = ms('2 hours');

type QueueEventName = keyof QueueEventsListener;

const DEFAULT_FIELDS_TO_FETCH: Array<keyof JobJsonRaw> = [
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
  // Time spent in the queue, i.e. difference between timestamp and processedOn
  responseTime: number;
  wait: number;
  success: boolean;
}

function shouldProxyEvent(eventName: string | symbol): boolean {
  return typeof eventName === 'string' && !eventName.startsWith('job.');
}

/**
 * Listens on a Queue to generate useful events
 * See https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-events.ts
 */
export class QueueListener extends Emittery {
  private readonly cache: LRUCache<string, any>;
  public readonly queue: Queue;
  private lastStreamId = '$';
  private lastTimestamp = 0;
  private queueEvents: QueueEvents;
  private _listening: boolean;
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
      ttl: CACHE_TIMEOUT,
    });

    // proxy events from contained QueueEvents
    this.on(Emittery.listenerAdded, ({ eventName }) => {
      // console.log(eventName);
      if (shouldProxyEvent(eventName)) {
        let name = String(eventName);
        if (name.startsWith('job.')) {
          name = name.substring(4);
          this.addProxyHandler(name);
        }
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
    this.cache.clear();
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
      let name = eventName;
      if (eventName.startsWith('job.')) {
        name = eventName.substring(4);
      }
      this.queueEvents.on(name as QueueEventName, (args, id) => {
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

  private preprocessJobEvent(
    eventName: QueueEventName,
    args: any,
    ts: string,
  ): JobEventData {
    const timestamp = timestampFromStreamId(ts);

    this._clock.set(timestamp);
    const _state = eventName === 'progress' ? 'active' : eventName;
    const jobId = args.jobId;
    let job = this.cache.get(jobId);
    if (!job) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, jobId, prev, ...rest } = args;
      job = rest;
      job.id = jobId;
      this.cache.set(jobId, job);
    }

    job.state = _state;
    job.prevState = args.prev;

    this.lastStreamId = ts;
    this.lastTimestamp = timestamp.getTime();
    this.currentJob = job;

    return {
      ts: this.lastTimestamp,
      prevState: args.prev,
      job,
      event: eventName,
    };
  }

  private emitJobEvents(data: JobEventData, isFinished = false) {
    if (!isFinished) {
      // todo: use pQueue for these
      Promise.all([
        this.emit(`job.${data.event}`, data),
        this.emit(`job.${data.job.id}`, data),
      ]).catch((err) => this.onError(err));
    }
  }

  private activeListener(
    args: { jobId: string; prev?: string },
    id: string,
  ): void {
    const data = this.preprocessJobEvent('active', args, id);
    const { job, ts } = data;
    data.prevState = args.prev;
    if (!job.timestamp && !args.prev) {
      job.timestamp = ts;
    }
    job.processedOn = ts;
    this.emitJobEvents(data);
  }

  protected completedListener(
    args: { jobId: string; returnvalue: string; prev?: string },
    id: string,
  ): void {
    const data = this.preprocessJobEvent('completed', args, id);
    const { job } = data;
    data.prevState = args.prev;
    job.returnvalue = args.returnvalue;
    this.markFinished(data, 'completed');
  }

  protected failedListener(
    args: { jobId: string; failedReason: string; prev?: string },
    id: string,
  ): void {
    const data = this.preprocessJobEvent('failed', args, id);
    const { job } = data;
    job.failedReason = args.failedReason;
    this.markFinished(data, 'failed');
  }

  protected waitingListener(args: { jobId: string }, id: string): void {
    const data = this.preprocessJobEvent('waiting', args, id);
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

    this.emitJobEvents(data);
  }

  protected delayedListener(
    args: { jobId: string; delay: number },
    id: string,
  ): void {
    const data = this.preprocessJobEvent('delayed', args, id);
    const { job } = data;
    if (!data.prevState && !job.timestamp) {
      // we're new
      job.timestamp = data.ts;
    }
    job.delay = args.delay;
    this.emitJobEvents(data);
  }

  protected removedListener(args: { jobId: string }, id: string): void {
    const timestamp = timestampFromStreamId(id);
    this._clock.set(timestamp);
    this.lastStreamId = id;
    this.lastTimestamp = timestamp.getTime();
    this.cache.delete(args.jobId);
  }

  protected stalledListener(args: { jobId: string }, id: string): void {
    const data = this.preprocessJobEvent('stalled', args, id);
    const { job } = data;
    job.isStalled = true;
    this.emitJobEvents(data);
  }

  protected progressListener(
    args: { jobId: string; data: number | object },
    id: string,
  ): void {
    const data = this.preprocessJobEvent('progress', args, id);
    const { job } = data;
    job.progress = args.data;
    this.emitJobEvents(data);
  }

  markFinished(data: JobEventData, status: 'completed' | 'failed'): void {
    const { job, ts } = data;
    const failed = status === 'failed';
    job.state = status;
    job.finishedOn = ts;

    this.getDurations(data)
      .then(({ latency, wait, responseTime }) => {
        const evtData: JobFinishedEventData = {
          job,
          ts,
          latency,
          responseTime,
          wait,
          success: !failed,
          event: status,
        };

        const finishedEvtData = { ...evtData, event: 'finished' };

        return Promise.all([
          this.emit(failed ? Events.FAILED : Events.COMPLETED, evtData),
          this.emit(FINISHED_EVENT, finishedEvtData),
        ]);
      })
      .catch((err) => {
        logger.error(`Error in handler for event: "${status}"`, {
          err,
          jobId: job.id,
        });
      });
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
  ): Promise<{ latency: number; wait: number; responseTime: number }> {
    const { job } = data;
    if (QueueListener.needsMeta(data)) {
      // since we're hitting the backend anyway, grab data
      // for other jobs at the same time
      await this.fetchJobData(20, job);
    }
    const finishedOn = job.finishedOn || systemClock.getTime();
    const latency = finishedOn && finishedOn - job.processedOn;
    const wait = job.timestamp && job.processedOn - job.timestamp;
    const responseTime = finishedOn && finishedOn - job.timestamp;

    return {
      latency,
      wait,
      responseTime,
    };
  }

  private async fetchJobData(
    count: number,
    includeJob?: Partial<AppJob>,
  ): Promise<any[]> {
    const jobs = [];
    const client = this._client || (await this.queue.client);
    const pipeline = client.multi();

    const addJob = (job): void => {
      jobs.push(job);
      const key = this.queue.toKey(job.id);
      pipeline.hmget(key, ...this.keysToFetch);
    };

    // Somewhat hacky
    const cacheDump = (this.cache as any).dumpLru();
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
        const [timestamp, processedOn, finishedOn, name, attemptsMade] =
          jobData;
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

  listen(): Promise<void> {
    return this.startListening();
  }

  unlisten(): Promise<void> {
    if (this._listening || this.queueEvents) {
      this._listening = false;
      return this.queueEvents.close().finally(() => (this.queueEvents = null));
    }
  }

  async startListening(ts: number | string = '$'): Promise<void> {
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

    const qe = (this.queueEvents = new QueueEvents(this.queue.name, {
      lastEventId: eventId,
      autorun: true,
      connection: client,
    }));

    qe.on('active', this.activeListener.bind(this));
    qe.on('completed', this.completedListener.bind(this));
    qe.on('failed', this.failedListener.bind(this));
    qe.on('delayed', this.delayedListener.bind(this));
    qe.on('stalled', this.stalledListener.bind(this));
    qe.on('waiting', this.waitingListener.bind(this));
    qe.on('removed', this.removedListener.bind(this));
    qe.on('progress', this.progressListener.bind(this));

    await this.queueEvents.waitUntilReady();
    this._listening = true;
  }

  createAsyncIterator<T = any, TOutput = T>(
    options: IteratorOptions<any, T, TOutput>,
  ): AsyncIterator<TOutput> {
    return createAsyncIterator<any, T, TOutput>(this, options);
  }
}
