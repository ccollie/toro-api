import crypto from 'crypto';
import nanoid from 'nanoid';
import { Queue } from 'bullmq';

import { createClient } from '@src/server/redis/utils';
export { createClient };

export function randomString(length = 10): string {
  return crypto.randomBytes(10).toString('hex');
}

export async function createQueue(name: string): Promise<Queue> {
  name = name || 'queue-' + randomString(6);
  // const client = await createClient();
  //  return new Queue(name, { client });
  return new Queue(name);
}

export function randomId(len = 8): string {
  return nanoid(len);
}

export function delay(ms): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
