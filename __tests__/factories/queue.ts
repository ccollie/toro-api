import { Queue, QueueOptions } from 'bullmq';
import { randomString } from '../server/utils';
import { TEST_DB, TEST_QUEUE_PREFIX } from './client';

export function createQueue(
  name?: string,
  opts?: Partial<QueueOptions>,
): Queue {
  name = name || 'queue-' + randomString(6);
  const options: QueueOptions = {
    connection: { db: TEST_DB, lazyConnect: false },
    prefix: TEST_QUEUE_PREFIX,
    ...(opts || {}),
  };
  return new Queue(name, options);
}
