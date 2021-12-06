import { Queue } from 'bullmq';
import { QueueListener } from '../../queues';

export function createQueueListener(queue: Queue): QueueListener {
  return new QueueListener(queue);
}
