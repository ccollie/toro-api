import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { EZContext } from 'graphql-ez';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  description: 'Returns true if the queue is currently paused.',
  resolve: async (queue: Queue, _: unknown, context: EZContext) => {
    return context.loaders.queuePaused.load(queue);
  },
};
