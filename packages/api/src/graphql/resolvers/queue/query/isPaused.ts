import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { EZContext } from 'graphql-ez';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  resolve: async (queue: Queue, _: unknown, context: EZContext) => {
    return context.loaders.queuePaused.load(queue);
  },
};
