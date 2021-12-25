import { ensureScriptsLoaded } from '../../commands';
import { Queue, QueueOptions, removeAllQueueData } from 'bullmq';
import { DEFAULT_CONNECTION_OPTIONS, TEST_QUEUE_PREFIX, TEST_DB } from './client';
import { nanoid } from 'nanoid';

export async function createQueue(
  name?: string,
  opts?: Partial<QueueOptions>,
): Promise<Queue> {
  name = name || 'queue-' + nanoid(4);
  const options: QueueOptions = {
    connection: {
      db: TEST_DB,
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

export async function clearQueueData(queue: Queue): Promise<void> {
  const client = await queue.client;
  await removeAllQueueData(client, queue.name, queue.opts.prefix);
}
