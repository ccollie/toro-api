import { Queue } from 'bullmq';
import { QueueListener } from '../../src/queues';
import { createQueue } from './queue';

export function createQueueListener(queue?: Queue): QueueListener {
  if (!queue) {
    queue = createQueue();
  }
  return new QueueListener(queue);
}
