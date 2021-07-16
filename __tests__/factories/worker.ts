import { Processor, Worker, WorkerOptions } from 'bullmq';
import { TEST_DB, TEST_QUEUE_PREFIX } from './client';

export function createWorker(
  queueName: string,
  processor: string | Processor,
  opts?: WorkerOptions,
): Worker {
  const options: WorkerOptions = {
    connection: { db: TEST_DB, lazyConnect: false },
    prefix: TEST_QUEUE_PREFIX,
    ...(opts || {}),
  };
  return new Worker(queueName, processor, options);
}
