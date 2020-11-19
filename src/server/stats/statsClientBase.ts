import { Queue } from 'bullmq';
import { DateLike, parseTimestamp, roundDown, roundUp } from '../lib/datetime';
import {
  getQueueBusKey,
  getQueueMetaKey,
  getStatsKey,
  systemClock,
} from '../lib';
import { StatisticalSnapshot, StatsGranularity, Timespan } from '@src/types';
import IORedis, { Pipeline } from 'ioredis';
import { isEmpty } from 'lodash';

/**
 * Base class for manipulating and querying collected queue stats in redis
 */
export class StatsClientBase {
  readonly queue: Queue;

  constructor(queue: Queue) {
    this.queue = queue;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  get busKey(): string {
    return getQueueBusKey(this.queue);
  }

  async getRange<T = any>(
    key: string,
    start: DateLike,
    end: DateLike,
  ): Promise<T[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const reply = await this.call(key, 'range', start, end);
    const result = new Array<T>();
    reply.forEach((data) => {
      try {
        const value = JSON.parse(data) as T;
        if (value) {
          result.push(value);
        }
      } catch {}
    });
    return result;
  }

  async getSpan(
    jobType: string,
    tag: string,
    unit?: StatsGranularity,
  ): Promise<Timespan | null> {
    const key = this.getKey(jobType, tag, unit);
    const span = await this.call(key, 'span');
    if (Array.isArray(span)) {
      const [start, end] = span;
      return { start, end };
    }
    return null;
  }

  async getLast(
    jobName: string,
    tag: string,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot> {
    const key = this.getKey(jobName, tag, unit);
    const value = await this.call(key, 'get', '+');
    if (!isEmpty(value)) {
      return JSON.parse(value) as StatisticalSnapshot;
    }
    return null;
  }

  /**
   * Find time gaps > a given interval in stats storage. Used in stats aggregation
   * to determine where "catch up" is needed in the case that the server was down
   * for a interval (hence aggregation was not done)
   * @param key sorted set key
   * @param start start timestamp
   * @param end end timestamp
   * @param interval interval time in ms
   * @return gaps as Array<{start: number, end: number}>
   */
  async getGaps(
    key: string,
    start: number,
    end: number,
    interval: number,
  ): Promise<Timespan[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const reply = await this.call(key, 'getGaps', start, end, interval);
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return parseGapsReply(reply);
  }

  /** Async iterator to get all gaps > interval ms in the given range */
  async *gapIterator(key: string, start, end, interval: number) {
    const cursorInterval = interval * 500; // todo: scale based on interval

    if (start === '-') {
      start = interval;
    } else {
      start = parseTimestamp(start);
    }

    let cursorStart = roundDown(start, interval);

    if (end === '+') {
      end = systemClock.getTime();
    } else {
      end = parseTimestamp(end);
    }

    end = roundUp(end, interval);

    while (cursorStart < end) {
      const cursorEnd = cursorStart + cursorInterval - 1;
      const items = await this.getGaps(key, cursorStart, cursorEnd, interval);
      if (items.length) {
        for (let i = 0; i < items.length; i++) {
          yield items[i];
        }
        const last = items[items.length - 1];
        cursorStart = last.end + 1;
      } else {
        cursorStart = cursorStart + cursorInterval;
      }
    }
  }

  async getMeta(): Promise<Record<string, string>> {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    return client.hgetall(key);
  }

  async setMeta(data: Record<string, any>): Promise<void> {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    await client.hmset(key, data);
  }

  async setLastWriteCursor(
    jobType: string,
    type: string,
    unit: string,
    value: DateLike,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const key = getCursorKey(jobType, type, unit);
    const update = {};
    if (typeof value === 'number') {
      update[key] = value;
    } else {
      update[key] = value.getTime();
    }

    return this.setMeta(update);
  }

  async getLastWriteCursor(
    jobType: string,
    type: string,
    unit?: string,
  ): Promise<number | null> {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const key = getCursorKey(jobType, type, unit);
    let meta = await this.getMeta();
    meta = meta || {};
    // todo: look at
    const value = meta[key];
    if (!value) {
      return 0;
    }

    return parseInt(value, 10);
  }

  protected async _callStats(
    client: Pipeline | IORedis.Redis,
    method: string,
    key: string,
    ...args: any[]
  ): Promise<any> {
    client = client || (await this.queue.client);
    return (client as any).timeseries(key, method, ...args);
  }

  protected async call(
    key: string,
    method: string,
    ...args: any[]
  ): Promise<any> {
    return this._callStats(null, method, key, ...args);
  }

  getKey(jobType: string, tag: string, unit?: StatsGranularity): string {
    return getStatsKey(this.queue, jobType, tag, unit);
  }
}

function parseGapsReply(response): Timespan[] {
  const result = [];

  if (Array.isArray(response)) {
    for (let i = 0; i < response.length; i += 2) {
      result.push({
        start: parseInt(response[i]),
        end: parseInt(response[i + 1]),
      });
    }
  }

  return result;
}

function getCursorKey(jobType: string, type: string, unit: string): string {
  jobType = jobType || '__QUEUE__';
  const key = [jobType, type, unit].filter((value) => !!value).join('-');
  return `cursor:${key}`;
}
