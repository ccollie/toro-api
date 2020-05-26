import { QueryContext } from '@src/server/query';
import { QueueListener } from '@src/server/monitor/queues';
import { Queue } from 'bullmq';
import { randomString } from './utils';

export function createQueue(name?: string): Queue {
  name = name || 'queue-' + randomString(6);
  // const client = await createClient();
  //  return new Queue(name, { client });
  return new Queue(name);
}

export function createQueueListener(queue?: Queue): QueueListener {
  if (!queue) {
    queue = createQueue();
  }
  return new QueueListener('my host', queue);
}

export function createContext(
  queueListener?: QueueListener,
  options?: any,
): QueryContext {
  queueListener = queueListener || createQueueListener();
  return new QueryContext(queueListener, options);
}
