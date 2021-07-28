import { Pipeline } from 'ioredis';
import { DateLike, parseTimestamp, roundDown, roundUp } from '@alpen/shared';
import toDate from 'date-fns/toDate';
import isDate from 'lodash/isDate';
import { Timespan } from '../types';
import { systemClock } from '../lib';
import { logger } from '../logger';
import { deserializePipeline } from '../redis';
import { RedisClient } from 'bullmq';

export type PossibleTimestamp = string | DateLike;

export interface TimeseriesBulkItem {
  ts: PossibleTimestamp;
  data: any;
}

function stringifyTimestamp(ts: PossibleTimestamp): string {
  if (typeof ts !== 'string') {
    if (!isDate(ts)) {
      ts = toDate(ts);
    }
    return ts.getTime().toString(10);
  } else {
    return ts;
  }
}

function stringifyData(data: any): string {
  if (typeof data === 'object') {
    return JSON.stringify(data);
  } else {
    return `${data}`;
  }
}

function prepBulkItems(data: TimeseriesBulkItem[]): any[] {
  const _data = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    _data.push(stringifyTimestamp(item.ts), stringifyData(item.data));
  }

  return _data;
}

export function parseGapsReply(response): Timespan[] {
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

function _pcall(
  client: Pipeline,
  method: string,
  key: string,
  ...args: any[]
): Pipeline {
  (client as any).timeseries(key, method, ...args);
  return client;
}

async function _call(
  client: RedisClient,
  method: string,
  key: string,
  ...args: any[]
): Promise<any> {
  return (client as any).timeseries(key, method, ...args);
}

async function get<T = any>(
  client: RedisClient,
  key: string,
  ts: PossibleTimestamp,
  remove: boolean,
): Promise<T | null> {
  const cmd = remove ? 'pop' : 'get';
  const value = await _call(client, cmd, key, stringifyTimestamp(ts));
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value.toString()) as T;
  } catch {
    // todo: log
    return null;
  }
}

function parseRangeParameters(
  start: PossibleTimestamp,
  end: PossibleTimestamp,
  offset?: number,
  count?: number,
): string[] {
  const args = [stringifyTimestamp(start), stringifyTimestamp(end)];
  if (typeof offset === 'number') {
    args.push('LIMIT', offset.toString(10));
    if (typeof count === 'number') {
      args.push(count.toString(10));
    }
  }
  return args;
}

async function rangeCmd(
  client: RedisClient,
  cmd: string,
  key: string,
  start: PossibleTimestamp,
  end: PossibleTimestamp,
  offset?: number,
  count?: number,
): Promise<any> {
  const args = parseRangeParameters(start, end, offset, count);
  return _call(client, cmd, key, ...args);
}

export interface TimeseriesValue<T = any> {
  // todo: make this a number. maybe its a string because of snowflake ids ??
  timestamp: string;
  value: T;
}

export function parseTimeseriesRangeResults<T = any>(
  reply: Array<[Error | null, [ts: string, data: any]]>,
): TimeseriesValue<T>[] {
  const result = new Array<TimeseriesValue<T>>();
  reply.forEach(([err, [timestamp, data]]) => {
    if (err) {
      logger.error(err);
      return;
    }
    try {
      const value = JSON.parse(data) as T;
      if (value !== undefined) {
        result.push({
          timestamp,
          value,
        });
      }
    } catch (e) {
      logger.log(e);
    }
  });
  return result;
}

async function getRange<T = any>(
  client: RedisClient,
  cmd: string,
  key: string,
  start: PossibleTimestamp,
  end: PossibleTimestamp,
  offset?: number,
  count?: number,
): Promise<TimeseriesValue<T>[]> {
  const reply = await rangeCmd(client, cmd, key, start, end, offset, count);
  const result = new Array<TimeseriesValue<T>>();
  reply.forEach(([timestamp, data]) => {
    try {
      const value = JSON.parse(data) as T;
      if (value !== undefined) {
        result.push({
          timestamp,
          value,
        });
      }
    } catch {}
  });
  return result;
}

async function getRangeByIndex<T = any>(
  client: RedisClient,
  key: string,
  start: number,
  end: number,
  asc = true,
): Promise<TimeseriesValue<T>[]> {
  let reply: string[] = [];
  if (asc) {
    reply = await client.zrange(key, start, end);
  } else {
    reply = await client.zrevrange(key, start, end);
  }
  const result = new Array<TimeseriesValue<T>>();
  reply.forEach((item) => {
    const [ts, data] = item.split('|');
    const timestamp = ts;
    try {
      const value = JSON.parse(data) as T;
      if (value !== undefined) {
        result.push({
          timestamp,
          value,
        });
      }
    } catch {}
  });
  return result;
}

function multiRangeCmd(
  client: Pipeline,
  cmd: string,
  key: string,
  start: PossibleTimestamp,
  end: PossibleTimestamp,
  offset?: number,
  count?: number,
): Pipeline {
  const args = parseRangeParameters(start, end, offset, count);
  return _pcall(client, cmd, key, ...args);
}

export class TimeSeries {
  static async add(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
    data: unknown,
  ): Promise<string> {
    const _ts = stringifyTimestamp(ts);
    const _data = stringifyData(data);
    return _call(client, 'add', key, _ts, _data);
  }

  static async bulkAdd(
    client: RedisClient,
    key: string,
    data: TimeseriesBulkItem[],
  ): Promise<number> {
    const _data = prepBulkItems(data);
    return _call(client, 'bulkAdd', key, ..._data);
  }

  static async del(
    client: RedisClient,
    key: string,
    ...ids: PossibleTimestamp[]
  ): Promise<number> {
    const _ids = ids.map(stringifyTimestamp);
    return _call(client, 'del', key, ..._ids);
  }

  static async get<T = any>(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
  ): Promise<T | null> {
    return get<T>(client, key, ts, false);
  }

  static async getMany<T = any>(
    client: RedisClient,
    key: string,
    ...ids: PossibleTimestamp[]
  ): Promise<(T | null)[]> {
    const pipeline = client.pipeline();
    ids.forEach((ts) => {
      (pipeline as any).timeseries(key, 'get', stringifyTimestamp(ts));
    });
    return deserializePipeline<T>(pipeline);
  }

  static async pop<T = any>(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
  ): Promise<T | null> {
    return get<T>(client, key, ts, true);
  }

  static async set(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
    data: unknown,
  ): Promise<any> {
    const _ts = stringifyTimestamp(ts);
    const _data = stringifyData(data);
    return _call(client, 'set', key, _ts, _data);
  }

  static async updateJson(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
    data: unknown,
  ): Promise<any> {
    const _ts = stringifyTimestamp(ts);
    const _data = stringifyData(data);
    return _call(client, 'updateJson', key, _ts, _data);
  }

  static async exists(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
  ): Promise<boolean> {
    const value = await _call(client, 'exists', key, stringifyTimestamp(ts));
    return !!value;
  }

  static async size(client: RedisClient, key: string): Promise<number> {
    return _call(client, 'size', key);
  }

  static async getRange<T = any>(
    client: RedisClient,
    key: string,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
    offset?: number,
    count?: number,
  ): Promise<TimeseriesValue<T>[]> {
    return getRange<T>(client, 'range', key, start, end, offset, count);
  }

  static async getRangeByIndex<T = any>(
    client: RedisClient,
    key: string,
    start: number,
    end: number,
    asc = true,
  ): Promise<TimeseriesValue<T>[]> {
    return getRangeByIndex<T>(client, key, start, end, asc);
  }

  static async getRevRange<T = any>(
    client: RedisClient,
    key: string,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
    offset?: number,
    count?: number,
  ): Promise<TimeseriesValue<T>[]> {
    return getRange<T>(client, 'revrange', key, start, end, offset, count);
  }

  static async removeRange(
    client: RedisClient,
    key: string,
    start: DateLike,
    end: DateLike,
    offset?: number,
    count?: number,
  ): Promise<number> {
    return rangeCmd(client, 'remrange', key, start, end, offset, count);
  }

  static async getSpan(
    client: RedisClient,
    key: string,
  ): Promise<{ start: string; end: string } | null> {
    const span = await _call(client, 'span', key);
    if (Array.isArray(span)) {
      const [start, end] = span;
      return { start, end };
    }
    return null;
  }

  static async getTimeSpan(
    client: RedisClient,
    key: string,
  ): Promise<Timespan | null> {
    const span = await TimeSeries.getSpan(client, key);
    if (span) {
      const { start, end } = span;
      return {
        startTime: parseInt(start),
        endTime: parseInt(end),
      };
    }
    return null;
  }

  static async getCount(
    client: RedisClient,
    key: string,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
  ): Promise<any> {
    const _start = stringifyTimestamp(start);
    const _end = stringifyData(end);
    return _call(client, 'count', key, _start, _end);
  }

  /**
   * Find time gaps > a given interval in stats storage. Used in stats aggregation
   * to determine where "catch up" is needed in the case that the server was down
   * for a interval (hence aggregation was not done)
   * @param client
   * @param key sorted set key
   * @param start start timestamp
   * @param end end timestamp
   * @param interval interval time in ms
   * @param max the maximum number of items to return
   * @return gaps as Array<{start: number, end: number}>
   */
  static async getGaps(
    client: RedisClient,
    key: string,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
    interval: number,
    max = 250,
  ): Promise<Timespan[] | null> {
    const args = [stringifyTimestamp(start), stringifyData(end), interval, max];
    const response = await _call(client, 'gaps', key, ...args);
    return parseGapsReply(response);
  }

  /** Async iterator to get all gaps > interval ms in the given range */
  static async *getGapIterator(
    client: RedisClient,
    key: string,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
    interval: number,
  ) {
    if (start === '-') {
      start = interval;
    } else {
      start = parseTimestamp(start);
    }

    let cursorStart = Math.max(0, roundDown(start, interval));

    if (end === '+') {
      end = systemClock.getTime();
    } else {
      end = parseTimestamp(end);
    }

    end = roundUp(end, interval);

    while (cursorStart < end) {
      const items = await TimeSeries.getGaps(
        client,
        key,
        cursorStart,
        end,
        interval,
      );
      if (items.length) {
        for (let i = 0; i < items.length; i++) {
          yield items[i];
        }
        const last = items[items.length - 1];
        cursorStart = last.endTime + 1;
      } else {
        break;
      }
    }
  }

  // Truncate values so that only the last (latest - retention) values remain
  static async truncate(
    client: RedisClient,
    key: string,
    retention: number,
  ): Promise<any> {
    return _call(client, 'truncate', key, retention);
  }

  static multi = {
    add(
      pipeline: Pipeline,
      key: string,
      ts: PossibleTimestamp,
      data: unknown,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcall(pipeline, 'add', key, _ts, _data);
    },
    bulkAdd(
      pipeline: Pipeline,
      key: string,
      data: TimeseriesBulkItem[],
    ): Pipeline {
      const _data = prepBulkItems(data);
      return _pcall(pipeline, 'bulkAdd', key, ..._data);
    },
    del(
      pipeline: Pipeline,
      key: string,
      ...ids: PossibleTimestamp[]
    ): Pipeline {
      const _ids = ids.map(stringifyTimestamp);
      return _pcall(pipeline, 'del', key, ..._ids);
    },
    get(pipeline: Pipeline, key: string, ts: PossibleTimestamp): Pipeline {
      return _pcall(pipeline, 'get', key, stringifyTimestamp(ts));
    },
    pop(pipeline: Pipeline, key: string, ts: PossibleTimestamp): Pipeline {
      return _pcall(pipeline, 'pop', key, stringifyTimestamp(ts));
    },
    set(
      pipeline: Pipeline,
      key: string,
      ts: PossibleTimestamp,
      data: unknown,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcall(pipeline, 'set', key, _ts, _data);
    },
    size(client: Pipeline, key: string): Pipeline {
      return _pcall(client, 'size', key);
    },
    exists(client: Pipeline, key: string, ts: PossibleTimestamp): Pipeline {
      return _pcall(client, 'exists', key, stringifyTimestamp(ts));
    },
    getGaps(
      pipeline: Pipeline,
      key: string,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
      interval: number,
    ): Pipeline {
      const args = [stringifyTimestamp(start), stringifyData(end), interval];
      return _pcall(pipeline, 'gaps', key, ...args);
    },
    getSpan(pipeline: Pipeline, key: string): Pipeline {
      return _pcall(pipeline, 'span', key);
    },
    getCount(
      pipeline: Pipeline,
      key: string,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
    ): Pipeline {
      const _start = stringifyTimestamp(start);
      const _end = stringifyData(end);
      return _pcall(pipeline, 'count', key, _start, _end);
    },
    getRange(
      pipeline: Pipeline,
      key: string,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
      offset?: number,
      count?: number,
    ): Pipeline {
      return multiRangeCmd(pipeline, 'range', key, start, end, offset, count);
    },
    getRevRange(
      pipeline: Pipeline,
      key: string,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
      offset?: number,
      count?: number,
    ): Pipeline {
      return multiRangeCmd(
        pipeline,
        'revrange',
        key,
        start,
        end,
        offset,
        count,
      );
    },
    removeRange(
      pipeline: Pipeline,
      key: string,
      start: DateLike,
      end: DateLike,
      offset?: number,
      count?: number,
    ): Pipeline {
      return multiRangeCmd(
        pipeline,
        'remrange',
        key,
        start,
        end,
        offset,
        count,
      );
    },
    truncate(pipeline: Pipeline, key: string, retention: number): Pipeline {
      return _pcall(pipeline, 'truncate', key, retention);
    },
    updateJson(
      pipeline: Pipeline,
      key: string,
      ts: PossibleTimestamp,
      data: unknown,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcall(pipeline, 'updateJson', key, _ts, _data);
    },
  };
}
