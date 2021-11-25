import { ensureScriptsLoaded } from '@alpen/core';
import { Queue, QueueOptions } from 'bullmq';
import { DEFAULT_CONNECTION_OPTIONS, TEST_QUEUE_PREFIX } from './client';
import { nanoid } from 'nanoid';

export async function createQueue(
  name?: string,
  opts?: Partial<QueueOptions>,
): Promise<Queue> {
  name = name || 'queue-' + nanoid(4);
  const options: QueueOptions = {
    connection: {
      ...DEFAULT_CONNECTION_OPTIONS
    },
    prefix: TEST_QUEUE_PREFIX,
    ...(opts || {}),
  };
  const queue = new Queue(name, options);
  const client = await queue.client;
  await ensureScriptsLoaded(client);
  return queue;
}
