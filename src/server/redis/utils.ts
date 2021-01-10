import IORedis, { Pipeline } from 'ioredis';
import url, { Url } from 'url';
import { isObject, chunk, isNil, isString } from 'lodash';
import { isValidDate } from '../lib/datetime';
import { isNumber, logger } from '../lib';
import { ConnectionOptions, RedisMetrics } from '../../types';
import { loadScripts } from '../commands';

export interface RedisStreamItem {
  id: string | number | Date;
  data: any;
}

export function createClient(redisOpts?: ConnectionOptions): IORedis.Redis {
  let client;
  if (isNil(redisOpts)) {
    client = new IORedis({ enableAutoPipelining: true }); // supported in 4.19.0
  } else if (isString(redisOpts)) {
    client = new IORedis(redisOpts as string);
  } else {
    // casting is done as types are behind the current release (4.19.0)
    const opts = {
      ...redisOpts,
      enableAutoPipelining: true,
    } as IORedis.RedisOptions;
    client = new IORedis(opts);
  }

  loadScripts(client).catch((err) => logger.warn(err));
  return client;
}

/**
 * Waits for a redis client to be ready.
 * @param {IORedis.Redis} redis client
 */
export async function waitUntilReady(client: IORedis.Redis): Promise<void> {
  return new Promise(function (resolve, reject) {
    if (client.status === 'ready') {
      resolve();
    } else {
      async function handleReady() {
        client.removeListener('error', handleError);
        resolve();
      }

      function handleError(err: Error) {
        client.removeListener('ready', handleReady);
        reject(err);
      }

      client.once('ready', handleReady);
      client.once('error', handleError);
    }
  });
}

export async function disconnect(client: IORedis.Redis): Promise<void> {
  if (client.status !== 'end') {
    let _resolve, _reject;

    const disconnecting = new Promise((resolve, reject) => {
      client.once('end', resolve);
      client.once('error', reject);
      _resolve = resolve;
      _reject = reject;
    });

    await client.disconnect();

    try {
      await disconnecting;
    } finally {
      client.removeListener('end', _resolve);
      client.removeListener('error', _reject);
    }
  }
}

/** Iterate redis keys by pattern  */
export function scanKeys(
  client: IORedis.Redis,
  options: any = {},
  batchFn: (keys: string[]) => any,
): Promise<void> {
  options.count = options.count || 500;
  return new Promise((resolve, reject) => {
    const stream = client.scanStream(options);

    const close = (err?: Error) => {
      stream.emit('close');
      return err ? reject(err) : resolve();
    };

    stream.on('data', async (keys: string[]) => {
      await stream.pause();
      if (keys.length === 0) {
        await stream.resume();
        return;
      }
      try {
        const res = await batchFn(keys);
        if (res === false) {
          close();
        } else {
          await stream.resume();
        }
      } catch (err) {
        err.pattern = options.match || '*';
        close(err);
      }
    });

    stream.on('end', () => resolve());
    stream.on('error', (err) => {
      reject(err);
      console.log('error', err);
    });
  });
}

export async function deleteByPattern(
  client: IORedis.Redis,
  pattern: string,
): Promise<number> {
  let totalCount = 0;
  let count = 0;
  let pipeline = client.pipeline();
  let shouldFlush = false;

  await scanKeys(client, { match: pattern }, async (keys) => {
    totalCount += keys.length;

    const chunked = chunk(keys, 250);
    count += chunked.length;

    chunked.forEach((items: string[]) => {
      shouldFlush = true;
      pipeline.unlink(...items);
    });

    if (count >= 250) {
      shouldFlush = false;
      await pipeline.exec();
      pipeline = client.pipeline();
    }
  });

  if (shouldFlush) {
    await pipeline.exec();
  }

  return totalCount;
}

// source
// eslint-disable-next-line max-len
// https://github.com/graphql-compose/graphql-compose-bullmq/blob/master/src/helpers/normalizePrefixGlob.ts
export function normalizePrefixGlob(prefixGlob: string): string {
  let prefixGlobNorm = prefixGlob || '';
  const sectionsCount = prefixGlobNorm.split(':').length - 1;

  if (sectionsCount > 1) {
    prefixGlobNorm += prefixGlobNorm.endsWith(':') ? '' : ':';
  } else if (sectionsCount === 1) {
    prefixGlobNorm += prefixGlobNorm.endsWith(':') ? '*:' : ':';
  } else {
    prefixGlobNorm += prefixGlobNorm.trim().length > 0 ? ':*:' : '*:*:';
  }

  prefixGlobNorm += 'meta';

  return prefixGlobNorm;
}

export function parseRedisURI(urlString: string): Record<string, any> {
  const redisOpts = Object.create(null) as Record<string, any>;
  try {
    const redisUrl: Url = url.parse(urlString);
    redisOpts.port = redisUrl.port || 6379;
    redisOpts.host = redisUrl.hostname;
    redisOpts.db = redisUrl.pathname ? redisUrl.pathname.split('/')[1] : 0;
    if (redisUrl.auth) {
      redisOpts.password = redisUrl.auth.split(':')[1];
    }
  } catch (e) {
    throw new Error(e.message);
  }
  return redisOpts;
}

// https://github.com/luin/ioredis/issues/747

export function parseObjectResponse(
  reply: any[],
  customParser = null,
): Record<string, any> {
  if (!Array.isArray(reply)) {
    return reply;
  }
  const data = Object.create(null);
  for (let i = 0; i < reply.length; i += 2) {
    if (customParser) {
      data[reply[i]] = customParser(reply[i], reply[i + 1]);
      continue;
    }
    data[reply[i]] = reply[i + 1];
  }
  return data;
}

export function parseMessageResponse(reply: any[]): RedisStreamItem[] {
  if (!Array.isArray(reply)) {
    return [];
  }
  return reply.map((message) => {
    return {
      id: message[0],
      data: parseObjectResponse(message[1]),
    };
  });
}

export function parseXinfoResponse(reply): RedisStreamItem {
  return parseObjectResponse(reply, (key, value) => {
    if (Buffer.isBuffer(key)) {
      key = key.toString();
    }
    switch (key) {
      case 'first-entry':
      case 'last-entry':
        if (!Array.isArray(value)) {
          return value;
        }
        return {
          id: value[0],
          data: parseObjectResponse(value[1]),
        };
      default:
        return value;
    }
  }) as RedisStreamItem;
}

export function checkMultiErrors(replies: any[] | null): any[] {
  return (
    replies &&
    replies.map((reply) => {
      const err = reply[0];
      if (err) throw err;
      return reply[1];
    })
  );
}

export function toKeyValueList(hash: any): any[] {
  if (typeof hash === 'object') {
    return Object.entries(hash).reduce((res, [key, value]) => {
      if (isValidDate(value)) {
        value = (value as Date).getTime();
      } else if (isObject(value)) {
        value = JSON.stringify(value);
      }
      return res.concat(key, value);
    }, []);
  } else {
    return ['value', hash];
  }
}

export async function deserializePipeline<T>(
  pipeline: Pipeline,
  defaultValue: T | null = null,
): Promise<(T | null)[]> {
  const response = await pipeline.exec().then(checkMultiErrors);
  const result: (T | null)[] = [];
  response.forEach((value) => {
    try {
      if (value) {
        result.push(JSON.parse(value.toString()) as T);
      } else {
        result.push(defaultValue);
      }
    } catch {
      result.push(defaultValue);
    }
  });
  return result;
}

type MetricName = keyof RedisMetrics;
const metrics: MetricName[] = [
  'redis_version',
  'tcp_port',
  'uptime_in_seconds',
  'uptime_in_days',
  'connected_clients',
  'blocked_clients',
  'total_system_memory',
  'used_memory',
  'used_memory_rss',
  'used_memory_peak',
  'used_cpu_sys',
  'maxmemory',
  'used_memory_lua',
  'number_of_cached_scripts',
  'instantaneous_ops_per_sec',
  'mem_fragmentation_ratio',
  'connected_clients',
  'blocked_clients',
  'role',
];

export async function getRedisInfo(
  client: IORedis.Redis,
): Promise<RedisMetrics> {
  const res = await client.info();
  const redisInfo = Object.create(null);

  const lines = res.toString().split('\r\n');

  lines.forEach((line) => {
    const parts = line.split(':');
    if (parts[1]) {
      redisInfo[parts[0]] = parts[1];
    }
  });

  redisInfo.versions = [];
  if (redisInfo.redis_version) {
    redisInfo.redis_version.split('.').forEach((num) => {
      redisInfo.versions.push(+num);
    });
  }

  return metrics.reduce((acc, metric) => {
    if (redisInfo[metric]) {
      const value = redisInfo[metric];
      acc[metric] = isNumber(value) ? parseFloat(value) : value;
    }

    return acc;
  }, {} as Record<MetricName, any>);
}
