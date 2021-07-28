import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { EZContext } from 'graphql-ez';

export const queueWorkerCount: FieldConfig = {
  type: 'Int!',
  async resolve(queue: Queue, args, context: EZContext): Promise<number> {
    const loader = context.loaders.getLoader<Queue, number>('workerCount');
    return loader.load(queue);
  },
};
