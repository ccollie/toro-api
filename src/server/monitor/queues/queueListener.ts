import { Queue, QueueEvents } from 'bullmq';
import ms from 'ms';
import { capitalize } from 'lodash';
import LRUCache from 'lru-cache';
import Emittery from 'emittery';
import * as IORedis from 'ioredis';
import { QueueConfig } from 'config';
import logger from '../../lib/logger';
import { isFinishedState } from '../../lib/utils';
import { parseTimestamp } from '../../lib/datetime';
import { systemClock } from '../../lib/clock';
import { timestampFromStreamId, parseStreamId } from '../../redis/streams';
import { AppJob } from 'jobs';

const MAKE_HANDLER = Symbol('make handler');

const JOB_STATES = [
  'completed',
  'waiting',
  'active',
  'failed',
  'progress',
  'removed',
  'stalled',
];

const CACHE_TIMEOUT = ms('2 hours');

const DEFAULT_FIELDS_TO_FETCH = [
  'timestamp',
  'processedOn',
  'finishedOn',
  'name',
  'failedReason',
  'attemptsMade',
];

export interface JobEventData extends Partial<AppJob> {
  prevState?: string;
  lastSeen: number;
  lastTimestamp: number;
  [k: string]: any;
}

interface JobEventHandler {
  (job: JobEventData, data?: any, ts?: number): Promise<any>;
}

/**
 * Listens on a Queue to generate useful events
 */
export class QueueListener extends Emittery {
  private readonly cache: LRUCache;
  public readonly host: string;
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

  constructor(host: string, queue: Queue) {
    super();
    this.host = host;
    this.queue = queue;

    this.cache = new LRUCache({
      max: 500,
      maxAge: CACHE_TIMEOUT,
    });

    this._handlerMap = {};
    JOB_STATES.forEach((state) => {
      this._handlerMap[state] = this[MAKE_HANDLER](state);
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
    const isFinished = isFinishedState(eventName);
    const fn = this[handlerName].bind(this);
    const cache = this.cache;
    const name = this.queue.name;

    return async (evt, ts): Promise<void> => {
      const { jobId } = evt;
      const timestamp = timestampFromStreamId(ts);

      let job = cache.get(jobId, !isFinished);
      if (!job) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { event, data, ...rest } = evt;
        job = rest;
        job.id = jobId;
        cache.set(jobId, job);
      }
      if (eventName !== 'progress') {
        job.state = eventName;
      }
      job.prevState = evt.prev;
      job.lastSeen = timestamp;

      try {
        this.lastStreamId = ts;
        this.lastTimestamp = timestamp.getTime();

        await fn(job, evt, timestamp);
        const evtData = {
          event: evt,
          job,
          queue: name,
          timestamp,
        };

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
   * @ignore
   */
  handleRemoved(job: JobEventData): void {
    this.cache.del(job.id);
  }

  handleActive(job: JobEventData, { prev }, ts): void {
    if (!job.timestamp && !prev) {
      job.timestamp = ts;
    }
    job.processedOn = ts;
  }

  handleCompleted(job: JobEventData, { returnvalue }, ts): any {
    job.returnvalue = returnvalue;
    return this.markFinished(job, ts);
  }

  handleFailed(job: JobEventData, { failedReason }, ts): any {
    job.failedReason = failedReason;
    return this.markFinished(job, ts, true);
  }

  handleWaiting(job: JobEventData, evt, ts): void {
    if (!job.prevState) {
      // we're new
      if (!job.timestamp) {
        job.timestamp = ts;
      }
    } else {
      job.processedOn = ts;
    }
    job.waitStart = ts;

    if (job.prevState === 'delayed') {
      job.delay = 0;
    }
  }

  handleDelayed(job: JobEventData, { delay }, ts): void {
    if (!job.prevState && !job.timestamp) {
      // we're new
      job.timestamp = ts;
    }
    job.delay = delay;
  }

  handleStalled(job): void {
    job.isStalled = true;
  }

  handleProgress(job: JobEventData, { data }): void {
    job.progress = data;
  }

  async markFinished(job: JobEventData, ts, failed = false): Promise<void> {
    job.finishedOn = ts;
    job.state = failed ? 'failed' : 'completed';

    const { latency, wait } = await this.getDurations(job);

    return this.emit('job.finished', {
      job,
      ts,
      latency,
      wait,
      success: !failed,
      failed,
    });
  }

  needsMeta(job: JobEventData): boolean {
    const needJobType = this.useJobTypes;
    return (
      (job && !job.timestamp) ||
      !job.processedOn ||
      !job.finishedOn ||
      (needJobType && !job.name)
    );
  }

  private async getDurations(
    job: JobEventData,
  ): Promise<{ latency: number; wait: number }> {
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
          failedReason,
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
        job.failedReason = failedReason;
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
}
