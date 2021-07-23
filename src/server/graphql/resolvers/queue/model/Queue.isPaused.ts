import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { Context } from '@server/graphql';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  resolve: async (queue: Queue, args: unknown, context: Context) => {
    const loader = context.loaders.getLoader<Queue, boolean>('queuePaused');
    return loader.load(queue);
  },
};
