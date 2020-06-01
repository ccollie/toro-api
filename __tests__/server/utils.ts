import crypto from 'crypto';
import nanoid from 'nanoid';
import { Queue } from 'bullmq';

import { createClient as _createClient } from '@src/server/redis/utils';
import * as IORedis from 'ioredis';
import { ConnectionOptions } from '@src/types';
import random from 'lodash/random';
import { loadScripts } from '../../src/server/commands';

export const TEST_DB = 13;
export const DEFAULT_CLIENT_OPTIONS: ConnectionOptions = {
  db: TEST_DB,
  lazyConnect: false
}

export async function createClient(options?: ConnectionOptions): Promise<IORedis.Redis> {
  options = options || DEFAULT_CLIENT_OPTIONS;
  const client = _createClient(options);
  await loadScripts(client);
  return client;
}

export async function clearDb(client?: IORedis.Redis) {
  const flushClient = client || (await createClient());
  await flushClient.flushdb();
  if (!client) {
    flushClient.disconnect();
  }
}

export function randomString(length = 10): string {
  return crypto.randomBytes(10).toString('hex');
}

export async function createQueue(name?: string): Promise<Queue> {
  name = name || 'queue-' + randomString(6);
  const client = await createClient();
  return new Queue(name, { connection: client });
}

export function randomId(len = 8): string {
  return nanoid(len);
}

export function flushPromises() {
  const scheduler = typeof setImmediate === 'function' ? setImmediate : setTimeout;
  return new Promise((resolve) => {
    scheduler(resolve, 0);
  });
}

export function delay(ms): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getRandomIntArray(count: number, max?: number, min?: number): number[] {
  if (!min && !max) {
    min = 0;
    max = 1000;
  } else if (!max) {
    max = min + Math.max(20, random(min, min + 1000))
  } else {
    min = 0;
  }
  const result = new Array(count);
  for (let i = 0; i < count; i++) {
    result[i] = random(min, max);
  }

  return result;
}
