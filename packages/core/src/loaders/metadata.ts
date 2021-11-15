// this exists solely to break circular dependencies
import { Queue, RedisClient } from 'bullmq';

export const queueIdMap = new WeakMap<Queue, string>();
export const queueClientMap = new WeakMap<Queue, RedisClient>();

export function getQueueId(queue: Queue): string {
  return queueIdMap.get(queue) ?? '';
}
