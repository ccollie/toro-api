import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { ResolverContext } from '@server/graphql';

export const isPaused: FieldConfig = {
  type: 'Boolean!',
  resolve: async (queue: Queue, args: unknown, context: ResolverContext) => {
    const loader = context.loaders.getLoader<Queue, boolean>('queuePaused');
    return loader.load(queue);
  },
};
