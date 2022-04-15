import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const jobNames: FieldConfig = {
  type: '[String!]!',
  description:
    'Returns a list of all job names in the queue, including those that are have schemas.',
  async resolve(queue: Queue, _, { accessors }: EZContext): Promise<string[]> {
    const manager = accessors.getQueueManager(queue);
    // todo: use loader
    return manager.getJobTypes();
  },
};
