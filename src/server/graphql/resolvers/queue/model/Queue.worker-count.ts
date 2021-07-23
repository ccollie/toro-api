import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { Context } from '@server/graphql';

export const queueWorkerCount: FieldConfig = {
  type: 'Int!',
  async resolve(queue: Queue, args, context: Context): Promise<number> {
    const loader = context.loaders.getLoader<Queue, number>('workerCount');
    return loader.load(queue);
  },
};
