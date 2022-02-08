import IORedis, { Pipeline, RedisOptions } from 'ioredis';
import { parseURL } from 'ioredis/built/utils';
import { isObject, isNil, isString, isPossiblyNumber, chunk } from '@alpen/shared';
import { isValidDate, hashObject, safeParse } from '@alpen/shared';
import { RedisClient, ConnectionOptions, isRedisInstance, scriptLoader } from 'bullmq';
import { ScriptError } from './script-error';
import { logger } from '../logger';
import * as path from 'path';

const ScriptPath = path.join(__dirname, '../commands');

export type RedisMetrics = {
  /* eslint-disable */
  redis_version: string;
  redis_mode: string;
  tcp_port: number;
  role: string;
  uptime_in_seconds: number;
  uptime_in_days: number;
  total_system_memory: number;
  total_system_memory_human: string;
  used_cpu_sys: number;
  used_memory: number;
  used_memory_human: string;
  used_memory_rss: number;
  used_memory_lua: number;
  used_memory_peak: number;
  used_memory_peak_human: string;
  maxmemory: number;
  mem_fragmentation_ratio: number;
  connected_clients: number;
  blocked_clients: number;
  number_of_cached_scripts: number;
  instantaneous_ops_per_sec: number;
  os: string;
  /* eslint-enable */
};

export interface RedisStreamItem {
  id: string | number | Date;
  data: any;
}

export function createClient(redisOpts?: ConnectionOptions | string): RedisClient {
  let client;
  if (isNil(redisOpts)) {
    client = new IORedis({
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }); // supported in 4.19.0
  } else if (isString(redisOpts)) {
    client = new IORedis(redisOpts as string);
  } else if (isRedisInstance(redisOpts)) {
    client = (redisOpts as RedisClient).duplicate();
  } else {
    const opts = {
      lazyConnect: false,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      ...redisOpts,
    } as RedisOptions;
    client = new IORedis(opts);
  }

  loadBaseScripts(client).catch((e) => logger.error(e));
  return client;
}

export async function loadBaseScripts(
  client: RedisClient,
): Promise<RedisClient> {
  await scriptLoader.load(client, ScriptPath);
  return client;
}

export async function disconnect(client: RedisClient): Promise<void> {
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
  client: RedisClient,
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
  client: RedisClient,
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
  return parseURL(urlString);
}

export function getClientHash(redis: RedisClient | string): string {
  let options: Record<string, any>;

  if (typeof redis === 'string') {
    options = parseURL(redis);
  } else {
    options = redis.options;
  }

  return hashObject(options);
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

const RE_ERROR = /user_script\:([0-9]+)\:\s*(.*)/m;

export function isScriptError(err: Error | string): boolean {
  const text = (typeof err === 'string') ? err : err.message;
  return RE_ERROR.test(text);
}

export function parseScriptError(
  err: string,
): { line: number; message: string; scriptHash?: string } | undefined {
  const res = RE_ERROR.exec(err);
  if (res) {
    const hashPrefix = 'call to f_';
    let scriptHash: string;
    const idx = err.indexOf(hashPrefix);
    if (idx > 0) {
      const end = err.indexOf(')', idx);
      if (end > 0) {
        scriptHash = err.substring(idx + hashPrefix.length, end).trim();
      }
    }
    // eslint-disable-next-line prefer-const
    let [, l, t] = res;

    // user_script can appear twice
    if (t.startsWith('user_script:')) {
      const [,, msg] = RE_ERROR.exec(t);
      t = msg;
    }
    return {
      line: parseInt(l),
      message: t,
      scriptHash
    };
  }
  return undefined;
}

export function translateReplyError(e: Error, client?: RedisClient): Error {
  if (isScriptError(e)) {
    let script = '';
    const { message, line, scriptHash } = parseScriptError(e.message);
    if (scriptHash && client) {
      // ugly hack to get the script details from the client
      const scriptsSet = ((client as any).scriptsSet) as Record<string, any>;
      if (scriptsSet) {
        const keys = Object.keys(scriptsSet);
        for (const key of keys) {
          if (scriptsSet[key].sha == scriptHash) {
            script = key;
            break;
          }
        }
      }
    }
    return new ScriptError(message, line, script);
  }
  return e;
}

type MetricName = keyof RedisMetrics;
const metrics: MetricName[] = [
  'redis_version',
  'tcp_port',
  'redis_mode',
  'uptime_in_seconds',
  'uptime_in_days',
  'connected_clients',
  'blocked_clients',
  'total_system_memory',
  'total_system_memory_human',
  'used_memory',
  'used_memory_human',
  'used_memory_rss',
  'used_memory_peak',
  'used_memory_peak_human',
  'used_cpu_sys',
  'maxmemory',
  'os',
  'used_memory_lua',
  'number_of_cached_scripts',
  'instantaneous_ops_per_sec',
  'mem_fragmentation_ratio',
  'connected_clients',
  'blocked_clients',
  'role',
];

export async function getRedisInfo(client: RedisClient): Promise<RedisMetrics> {
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
      acc[metric] = isPossiblyNumber(value) ? parseFloat(value) : value;
    }

    return acc;
  }, {} as Record<MetricName, any>);
}

// parse result of redis client list command
export function parseClientList(
  list: string,
  handler: (key: string, value: any) => boolean | void,
): void {
  const lines = list.split('\n');
  let done = false;
  for (let i = 0; i < lines.length && !done; i++) {
    const line = lines[i];
    const keyValues = line.split(' ');
    keyValues.forEach(function (keyValue) {
      const index = keyValue.indexOf('=');
      const key = keyValue.substring(0, index);
      const v = keyValue.substring(index + 1);
      const val = safeParse(v);
      if (handler(key, val) === false) {
        done = true;
        return;
      }
    });
  }
}
