import { Queue, QueueOptions } from 'bullmq';
import { DEFAULT_CONNECTION_OPTIONS, TEST_QUEUE_PREFIX } from './client';
import { nanoid } from 'nanoid';

export function createQueue(
  name?: string,
  opts?: Partial<QueueOptions>,
): Queue {
  name = name || 'queue-' + nanoid(6);
  const options: QueueOptions = {
    connection: {
      ...DEFAULT_CONNECTION_OPTIONS
    },
    prefix: TEST_QUEUE_PREFIX,
    ...(opts || {}),
  };
  return new Queue(name, options);
}
