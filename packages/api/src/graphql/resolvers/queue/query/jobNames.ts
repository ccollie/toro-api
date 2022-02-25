import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const jobNames: FieldConfig = {
  type: '[String!]!',
  async resolve(queue: Queue, _, { accessors }: EZContext): Promise<string[]> {
    const manager = accessors.getQueueManager(queue);
    // todo: use loader
    return manager.getJobTypes();
  },
};
