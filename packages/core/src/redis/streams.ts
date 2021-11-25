import { badRequest } from '@hapi/boom';
import { toKeyValueList, parseXinfoResponse, RedisStreamItem } from './utils';
import { toDate } from 'date-fns';
import { isDate } from 'lodash';
import IORedis from 'ioredis';
import { RedisClient } from 'bullmq';
import { isNumber } from '@alpen/shared';

const deserializerMap = new Map();
const deserializerCache = new Map();

const ID_REGEX = /[\d]+-[\d]+/;

export function convertTsForStream(timestamp: number | string | Date): string {
  const type = typeof timestamp;
  if (type === 'string') {
    const str = timestamp as string;
    if (['+', '-', '*'].includes(str)) return str;

    if (str.match(ID_REGEX)) {
      return str;
    }
    throw badRequest('Invalid stream timestamp "' + str + '"');
  } else if (type === 'number') {
    const ts = toDate(timestamp as number);
    return ts.getTime() + '';
  } else {
    const ts = toDate(timestamp as Date);
    return ts.getTime() + '';
  }
}

export function streamAdd(
  multi: IORedis.Pipeline,
  key: string,
  timestamp,
  value,
): IORedis.Pipeline {
  const args = toKeyValueList(value);
  return multi.xadd(key, convertTsForStream(timestamp), ...args);
}

export function bulkStreamAdd(
  multi: IORedis.Pipeline,
  key: string,
  ...args: any[]
): void {
  let values;
  for (let i = 0; i < args.length; i += 2) {
    args[i] = convertTsForStream(args[i]);
    const val = args[i + 1];
    if (typeof val === 'object') {
      values = toKeyValueList(val);
    } else {
      values = ['value', val];
    }
    multi.xadd(key, args[i], ...values);
  }
}

export function getStreamDeserializer(key: string) {
  const fn = deserializerCache.get(key);
  if (!fn) {
    for (const [regex, cb] of deserializerMap) {
      if (regex && key.match(regex)) {
        deserializerCache.set(key, cb);
        return cb;
      }
    }
  }
  return fn;
}

export async function getStreamInfo(
  client: RedisClient,
  stream: string,
): Promise<RedisStreamItem> {
  try {
    const reply = await client.xinfo('STREAM', stream);
    return parseXinfoResponse(reply);
  } catch (err) {
    if (err.message.match(/no such key/)) {
      return null;
    }
    throw err;
  }
}

export function parseStreamId(ts: unknown): string {
  const type = typeof ts;
  if (type === 'string') {
    const parts = (ts as string).split('-');
    const id = parts[0];
    const seq = parts[1] || 0;
    if (isNumber(id) && isNumber(seq)) {
      return `${id}-${seq}`;
    }
  } else if (type === 'number') {
    return ts.toString();
  } else if (isDate(ts)) {
    return ts.getTime() + '-0';
  }
  return null;
}

// redis stream '*' returns epoch milliseconds
export function timestampFromStreamId(id: string): Date {
  if (!id) return undefined;
  const [timestamp] = id.split('-');
  return new Date(parseInt(timestamp));
}
