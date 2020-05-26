import { getIterator as getDateRangeIterator } from '../lib/datetime';
import {
  toKeyValueList,
  parseMessageResponse,
  parseXinfoResponse,
  RedisStreamItem,
} from './utils';
import { toDate } from 'date-fns';
import { isString, isDate } from 'lodash';
import { isNumber } from '../lib/utils';

const deserializerMap = new Map();
const deserializerCache = new Map();

const ID_REGEX = /[\d]+-[\d]+/;

export function convertTsForStream(timestamp): any {
  if (typeof timestamp === 'string') {
    if (['+', '-', '*'].includes(timestamp)) return timestamp;

    if (timestamp.match(ID_REGEX)) {
      return timestamp;
    }
  }

  timestamp = toDate(timestamp);

  return timestamp.getTime();
}

export function add(multi, key: string, timestamp, value) {
  const args = toKeyValueList(value);
  return multi.xadd(key, convertTsForStream(timestamp), ...args);
}

export function bulkAdd(multi, key: string, ...args): void {
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

export function getDeserializer(key) {
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

export async function getStreamRange(
  client,
  key: string,
  start,
  end,
  asc = true,
): Promise<RedisStreamItem[]> {
  start = convertTsForStream(start);
  end = convertTsForStream(end);
  let reply;

  if (asc) {
    reply = await client.xrange(key, start, end);
  } else {
    reply = await client.xrevrange(key, start, end);
  }

  let response = parseMessageResponse(reply);
  const deserializer = getDeserializer(key);
  if (deserializer) {
    response = response.map(({ id, data }) => {
      return {
        id,
        data: deserializer(data),
      };
    });
  }
  return response;
}

/**
 * @param {Object} client
 * @param {String} key
 * @param {Date|Number} start start of range
 * @param {Date|Number} end end of range
 * @param {Number} interval = interval in milliseconds. Default to 10 seconds
 * @param {Boolean} align align dates to interval
 */
export async function* getStreamIterator(
  client,
  key: string,
  start,
  end,
  interval = 10000,
  align = false,
) {
  for (const r of getDateRangeIterator(start, end, interval, align)) {
    yield getStreamRange(client, key, r.start, r.end);
  }
}

export async function getInfo(client, stream: string) {
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

export async function getLast(client, key: string) {
  const info = await getInfo(client, key);
  let result = info && info['last-entry'];
  if (result) {
    const deserializer = getDeserializer(key);
    if (deserializer) {
      result = {
        id: result.id,
        data: deserializer(result.data),
      };
    }
  }
  return result;
}

export async function getSpan(client, key: string) {
  const info = await getInfo(client, key);

  function getTs(key: string): string {
    return info && info[key] && info[key].id;
  }

  return {
    start: getTs('first-entry'),
    end: getTs('last-entry'),
  };
}

export async function getLastTimestamp(client, key: string): Promise<string> {
  const { end } = await getSpan(client, key);
  return end;
}

export function parseStreamId(ts: any): string {
  const type = typeof ts;
  if (type === 'string') {
    const parts = ts.split('-');
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

export function incrementStreamId(id: any): string {
  const type = typeof id;
  if (type === 'string') {
    const parts = id.split('-');
    const _id = parts[0];
    let seq = parseInt(parts[1] || 0);
    if (isNaN(seq)) {
      seq = 1;
    } else {
      seq++;
    }
    return `${_id}-${seq}`;
  } else if (type === 'number') {
    ++id;
    return `${id}`;
  } else if (isDate(id)) {
    id = id.getTime() + '-1';
  }
  if (!id) return '0-1';

  return id;
}

export function registerDeserializer(key: string | RegExp, fn): void {
  if (isString(key)) {
    deserializerCache.set(key, fn);
  } else {
    // regex
    deserializerMap.set(key, fn);
  }
}
