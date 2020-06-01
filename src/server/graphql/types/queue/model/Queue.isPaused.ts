import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  resolve: async (queue: Queue) => {
    const client = await queue.client;
    const meta = await client.hgetall(queue.keys.meta);
    return meta?.paused ? !!+meta.paused : false;
  },
};
