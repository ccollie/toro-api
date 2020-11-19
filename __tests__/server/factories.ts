import { QueueListener } from '@src/server/queues';
import { Processor, Queue, QueueOptions, Worker, WorkerOptions } from 'bullmq';
import { DEFAULT_CLIENT_OPTIONS, randomString, TEST_DB } from './utils';
import {
  RedisStreamAggregator,
  RedisStreamAggregatorOptions
} from './common';

export function createQueue(name?: string, opts?: Partial<QueueOptions>): Queue {
  name = name || 'queue-' + randomString(6);
  const options: QueueOptions = {
    connection: {
      db: TEST_DB,
      // lazyConnect: true,
    },
    prefix: 'test',
    ...(opts || {})
  }
  return new Queue(name, options);
}

export function createQueueListener(queue?: Queue): QueueListener {
  if (!queue) {
    queue = createQueue();
  }
  return new QueueListener(queue);
}

export function createWorker(queueName: string, processor: string | Processor, opts?: WorkerOptions): Worker {
  const options: WorkerOptions = {
    connection: { db: TEST_DB, lazyConnect: false },
    ...(opts || {})
  }
  return new Worker(queueName, processor, options);
}

export function createRedisStreamAggregator(options?: Partial<RedisStreamAggregatorOptions>) {
  return new RedisStreamAggregator({
    connectionOptions: DEFAULT_CLIENT_OPTIONS,
    ...(options || {})
  });

}
