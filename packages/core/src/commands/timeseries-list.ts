import { Pipeline } from 'ioredis';
import {
  DateLike,
  isDate,
} from '@alpen/shared';
import toDate from 'date-fns/toDate';
import { RedisClient } from 'bullmq';

export type PossibleTimestamp = string | DateLike;

export type TimeseriesListMetadata = {
  firstTS: number;
  lastTS: number;
  count: number;
};

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

function _pcall(
  client: Pipeline,
  method: string,
  key: string,
  ...args: any[]
): Pipeline {
  (client as any).timeseriesList(key, method, ...args);
  return client;
}

function _pcallBuffer(
  client: Pipeline,
  method: string,
  key: string,
  ...args: any[]
): Pipeline {
  (client as any).timeseriesListBuffer(key, method, ...args);
  return client;
}

async function _call(
  client: RedisClient,
  method: string,
  key: string,
  ...args: any[]
): Promise<any> {
  return (client as any).timeseriesList(key, method, ...args);
}

async function _callBuffer(
  client: RedisClient,
  method: string,
  key: string,
  ...args: any[]
): Promise<any> {
  return (client as any).timeseriesListBuffer(key, method, ...args);
}

function parseRangeParameters(
  interval: number,
  start: PossibleTimestamp,
  end: PossibleTimestamp,
): string[] {
  const args = [
    interval.toString(),
    stringifyTimestamp(start),
    stringifyTimestamp(end),
  ];
  return args;
}


function parseRangeResponse(res: unknown, period: number): TimeseriesValue[] {
  const result = [];
  if (Array.isArray(res)) {
    if (res.length > 1) {
      const ts = parseInt(res[res.length - 1]);
      for (let i = res.length - 2; i >= 0; i--) {
        const item = {
          timestamp: ts - result.length * period,
          value: res[i],
        };
        result.push(item);
      }
    }
  }
  return result;
}

export interface TimeseriesValue<T = any> {
  // todo: make this a number. maybe its a string because of snowflake ids ??
  timestamp: number;
  value: T;
}

export class TimeSeriesList {
  static async add(
    client: RedisClient,
    key: string,
    interval: number,
    ts: PossibleTimestamp,
    data: unknown,
  ): Promise<string> {
    const _ts = stringifyTimestamp(ts);
    const _data = stringifyData(data);
    return _call(client, 'add', key, interval, _ts, _data);
  }

  static async addBuffer(
    client: RedisClient,
    key: string,
    interval: number,
    ts: PossibleTimestamp,
    data: Uint8Array | Buffer,
  ): Promise<string> {
    const _ts = stringifyTimestamp(ts);
    return _callBuffer(client, 'add', key, interval, _ts, data);
  }

  static async bulkAdd(
    client: RedisClient,
    key: string,
    interval: number,
    data: TimeseriesBulkItem[],
  ): Promise<number> {
    const _data = prepBulkItems(data);
    return _call(client, 'bulkAdd', key, interval, ..._data);
  }

  static async get<T = any>(
    client: RedisClient,
    key: string,
    interval: number,
    ts: PossibleTimestamp,
  ): Promise<T | null> {
    const value = await _call(
      client,
      'get',
      key,
      interval,
      stringifyTimestamp(ts),
    );
    if (value === null || value === undefined) return null;
    try {
      return JSON.parse(value.toString()) as T;
    } catch {
      // todo: log
      return null;
    }
  }

  static async getBuffer(
    client: RedisClient,
    key: string,
    ts: PossibleTimestamp,
    interval: number,
  ): Promise<Buffer | null> {
    const value = await _callBuffer(
      client,
      'get',
      key,
      interval,
      stringifyTimestamp(ts),
    );
    if (value === null || value === undefined) return null;
    return value as Buffer;
  }

  static async getRange<T = any>(
    client: RedisClient,
    key: string,
    interval: number,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
  ): Promise<TimeseriesValue<T>[]> {
    const args = parseRangeParameters(interval, start, end);
    const res = _call(client, 'range', key, ...args);
    const reply = parseRangeResponse(res, interval);
    const result = new Array<TimeseriesValue<T>>();
    reply.forEach(({ timestamp, value: data }) => {
      try {
        const value = JSON.parse('' + data) as T;
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

  static async getRangeBuffer(
    client: RedisClient,
    key: string,
    interval: number,
    start: PossibleTimestamp,
    end: PossibleTimestamp,
  ): Promise<TimeseriesValue<Buffer>[]> {
    const args = parseRangeParameters(interval, start, end);
    const res = _callBuffer(client, 'range', key, ...args);
    const reply = parseRangeResponse(res, interval);
    const result = new Array<TimeseriesValue<Buffer>>();
    reply.forEach(({ timestamp, value }) => {
      try {
        result.push({
          timestamp,
          value: value as Buffer,
        });
      } catch {}
    });
    return result;
  }

  static async set(
    client: RedisClient,
    key: string,
    interval: number,
    ts: PossibleTimestamp,
    data: unknown,
  ): Promise<any> {
    const _ts = stringifyTimestamp(ts);
    const _data = stringifyData(data);
    return _call(client, 'set', key, interval, _ts, _data);
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

  static async metadata(
    client: RedisClient,
    key: string,
  ): Promise<TimeseriesListMetadata> {
    const str = await _call(client, 'metadata', key);
    if (!str) return null;
    const value = JSON.parse(str);
    return value as TimeseriesListMetadata;
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

  // Truncate values so that only the last (latest - retention) values remain
  static async truncate(
    client: RedisClient,
    key: string,
    period: number,
    retention: number,
  ): Promise<any> {
    return _call(client, 'truncate', key, period, retention);
  }

  static multi = {
    add(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
      data: unknown,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcall(pipeline, 'add', key, interval, _ts, _data);
    },
    addBuffer(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
      data: Uint8Array | Buffer,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      return _pcallBuffer(pipeline, 'add', key, interval, _ts, data);
    },
    bulkAdd(
      pipeline: Pipeline,
      key: string,
      interval: number,
      data: TimeseriesBulkItem[],
    ): Pipeline {
      const _data = prepBulkItems(data);
      return _pcall(pipeline, 'bulkAdd', key, interval, ..._data);
    },
    get(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
    ): Pipeline {
      return _pcall(pipeline, 'get', key, interval, stringifyTimestamp(ts));
    },
    getBuffer(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
    ): Pipeline {
      return _pcallBuffer(
        pipeline,
        'get',
        key,
        interval,
        stringifyTimestamp(ts),
      );
    },
    set(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
      data: unknown,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcall(pipeline, 'set', key, interval, _ts, _data);
    },
    setBuffer(
      pipeline: Pipeline,
      key: string,
      interval: number,
      ts: PossibleTimestamp,
      data: Uint8Array,
    ): Pipeline {
      const _ts = stringifyTimestamp(ts);
      const _data = stringifyData(data);
      return _pcallBuffer(pipeline, 'set', key, interval, _ts, _data);
    },
    size(client: Pipeline, key: string): Pipeline {
      return _pcall(client, 'size', key);
    },
    exists(client: Pipeline, key: string, ts: PossibleTimestamp): Pipeline {
      return _pcall(client, 'exists', key, stringifyTimestamp(ts));
    },
    getSpan(pipeline: Pipeline, key: string): Pipeline {
      return _pcall(pipeline, 'span', key);
    },
    getMetadata(pipeline: Pipeline, key: string): Pipeline {
      return _pcall(pipeline, 'metadata', key);
    },
    getRange(
      client: Pipeline,
      key: string,
      interval: number,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
    ): Pipeline {
      const args = parseRangeParameters(interval, start, end);
      return _pcall(client, 'range', key, ...args);
    },
    getRangeBuffer(
      client: Pipeline,
      key: string,
      interval: number,
      start: PossibleTimestamp,
      end: PossibleTimestamp,
    ): Pipeline {
      const args = parseRangeParameters(interval, start, end);
      return _pcallBuffer(client, 'range', key, ...args);
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
