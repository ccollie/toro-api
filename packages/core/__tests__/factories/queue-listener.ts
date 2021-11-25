import { Queue } from 'bullmq';
import { QueueListener } from '../../src/queues';

export function createQueueListener(queue: Queue): QueueListener {
  return new QueueListener(queue);
}
