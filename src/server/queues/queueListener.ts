import { Queue, QueueEvents } from 'bullmq';
import ms from 'ms';
import { capitalize } from 'lodash';
import LRUCache from 'lru-cache';
import Emittery from 'emittery';
import * as IORedis from 'ioredis';
import { QueueConfig } from 'config';
import logger from '../lib/logger';
import { isFinishedStatus } from '../lib/utils';
import { parseTimestamp } from '../lib/datetime';
import { systemClock } from '../lib/clock';
import { timestampFromStreamId, parseStreamId } from '../redis/streams';
import { AppJob, JobStatusEnum } from '../../types';
import {
  createAsyncIterator,
  createAsyncIterable,
  IteratorOptions,
} from '../lib';

const FINISHED_EVENT = 'job.finished';

const MAKE_HANDLER = Symbol('make job event handler');

const QUEUE_EVENTS = Object.values(JobStatusEnum);

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
  id: string;
  job: Partial<AppJob>;
  prevState?: string;
  waitStart?: number;
  ts: number;
  event: string;
  [k: string]: any;
}

export interface JobFinishedEvent extends JobEventData {
  latency: number;
  wait: number;
  success: boolean;
}

interface JobFinishedEventHandler {
  (event: JobFinishedEvent): void;
}

interface JobEventHandler {
  (job: JobEventData, data?: any, ts?: number): Promise<any>;
}

/**
 * Listens on a Queue to generate useful events
 */
export class QueueListener extends Emittery {
  private readonly cache: LRUCache;
  public readonly queue: Queue;
  private lastStreamId = '$';
  private lastTimestamp = 0;
  private queueEvents: QueueEvents;
  private _listening: boolean;
  private readonly _handlerMap: {};
  private readonly useJobTypes: boolean;
  private readonly keysToFetch: string[];
  private _client: IORedis.Redis = null;
  private currentJob: any;
  readonly queueConfig: QueueConfig;

  constructor(queue: Queue) {
    super();
    this.queue = queue;

    this.cache = new LRUCache({
      max: 500,
      maxAge: CACHE_TIMEOUT,
    });

    this._handlerMap = {};
    QUEUE_EVENTS.forEach((state) => {
      const handler = this[MAKE_HANDLER](state);
      if (handler) {
        this._handlerMap[state] = handler;
      }
    });

    this.keysToFetch = [...DEFAULT_FIELDS_TO_FETCH];
  }

  destroy(): Promise<void> {
    this.cache.reset();
    return this.unlisten();
  }

  get isListening(): boolean {
    return !!this._listening;
  }

  get jobTypes(): string[] {
    const types = this.queueConfig.jobTypes;
    return Array.isArray(types) ? types : [];
  }

  [MAKE_HANDLER](eventName: string) {
    const handlerName = `handle${capitalize(eventName)}`;
    const isFinished = isFinishedStatus(eventName);
    let fn = this[handlerName];
    if (!fn) {
      return null;
    }
    fn = fn.bind(this);
    const cache = this.cache;

    return async (evt, ts): Promise<void> => {
      const { jobId } = evt;
      const timestamp = timestampFromStreamId(ts);

      let job: Partial<AppJob>;
      let jobData = cache.get(jobId, !isFinished) as JobEventData;
      if (!jobData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { event, data, jobId: ignore, ...rest } = evt;
        job = rest;
        job.id = jobId;
        jobData = {
          id: jobId,
          event,
          prevState: null,
          job,
          ts: timestamp.getTime(),
        };
        cache.set(jobId, jobData);
      } else {
        jobData.event = evt.event;
        job = jobData.job || (jobData.job = {});
        jobData.prevState = evt.prev;
        jobData.ts = timestamp.getTime();
      }
      job.state =
        eventName === 'progress'
          ? JobStatusEnum.active
          : (eventName as JobStatusEnum);

      try {
        this.lastStreamId = ts;
        this.lastTimestamp = jobData.ts;

        await fn(jobData, evt, timestamp);

        this.currentJob = job;

        if (!isFinished) {
          // todo: use pQueue for these
          await Promise.all([
            this.emit(`job.${eventName}`, jobData),
            this.emit(`job.${jobId}`, jobData),
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
   * @ignore
   */
  handleRemoved(event: JobEventData): void {
    this.cache.del(event.id);
  }

  handleActive(event: JobEventData, { prev }, ts): void {
    const { job } = event;
    if (!job.timestamp && !prev) {
      job.timestamp = ts;
    }
    job.processedOn = ts;
  }

  handleCompleted(event: JobEventData, { returnvalue }, ts): any {
    const { job } = event;
    job.returnvalue = returnvalue;
    return this.markFinished(event, ts);
  }

  handleFailed(event: JobEventData, { failedReason }, ts): any {
    const { job } = event;
    job.failedReason = failedReason;
    return this.markFinished(event, ts, true);
  }

  handleWaiting(event: JobEventData, evt, ts): void {
    const { job } = event;
    if (!event.prevState) {
      // we're new
      if (!job.timestamp) {
        job.timestamp = ts;
      }
    } else {
      job.processedOn = ts;
    }
    event.waitStart = ts;

    if (event.prevState === 'delayed') {
      job.delay = 0;
    }
  }

  handleDelayed(event: JobEventData, { delay }, ts): void {
    const { job } = event;
    if (!event.prevState && !job.timestamp) {
      // we're new
      job.timestamp = ts;
    }
    job.delay = parseInt(delay);
  }

  handleStalled(job): void {
    job.isStalled = true;
  }

  handleProgress(event: JobEventData, { data }): void {
    const { job } = event;
    job.progress = data;
  }

  async markFinished(event: JobEventData, ts, failed = false): Promise<void> {
    const { job } = event;
    job.finishedOn = ts;
    job.state = failed ? JobStatusEnum.failed : JobStatusEnum.completed;

    const { latency, wait } = await this.getDurations(event);

    const finishedEvent: JobFinishedEvent = {
      ...event,
      latency,
      wait,
      success: !failed,
      event: 'finished',
    };
    return this.emit(FINISHED_EVENT, finishedEvent);
  }

  private needsMeta(job: Partial<AppJob>): boolean {
    const needJobType = this.useJobTypes;
    return (
      (job && !job.timestamp) ||
      !job.processedOn ||
      !job.finishedOn ||
      (needJobType && !job.name)
    );
  }

  private async getDurations(
    event: JobEventData,
  ): Promise<{ latency: number; wait: number }> {
    const { job } = event;
    if (this.needsMeta(job)) {
      // since we're hitting the backend anyway, grab data
      // for other getJobs at the same time
      await this.fetchJobData(20, job);
    }
    const finishedOn = job.finishedOn || systemClock.now();
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
      const item = hit && hit.value;
      if (this.needsMeta(item)) {
        addJob(item);
      }
    }

    if (includeJob) {
      addJob(includeJob);
    }
    // todo: if were completed, also return value

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
          // failedReason,
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
        // job.failedReason = failedReason;
      }
    });

    return result;
  }

  getCachedJob(id): object {
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
      this.lastTimestamp = systemClock.now();
    } else {
      eventId = parseStreamId(ts);
      this.lastTimestamp = parseTimestamp(ts);
    }

    this.queueEvents = new QueueEvents(this.queue.name, {
      lastEventId: eventId,
      client: client.duplicate(),
    });

    Object.keys(this._handlerMap).forEach((event) => {
      this.queueEvents.on(event, this._handlerMap[event]);
    });

    await this.queueEvents.waitUntilReady();
    this._listening = true;
  }

  createAsyncIterator<T = JobEventData, TOutput = T>(
    options: IteratorOptions<any, T, TOutput>,
  ): AsyncIterator<TOutput> {
    return createAsyncIterator<any, T, TOutput>(this, options);
  }

  createAsyncIterable<T = JobEventData, TOutput = T>(
    options: IteratorOptions<any, T, TOutput>,
  ): AsyncIterable<TOutput> {
    return createAsyncIterable<any, T, TOutput>(this, options);
  }
}
