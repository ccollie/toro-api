import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { EZContext } from 'graphql-ez';

export const workerCount: FieldConfig = {
  type: 'Int!',
  async resolve(queue: Queue, args, context: EZContext): Promise<number> {
    return context.loaders.workerCount.load(queue);
  },
};
