import boom from '@hapi/boom';
import { Job } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const jobQueueIdFC: FieldConfig = {
  type: 'String!',
  makeNonNull: true,
  async resolve(parent: Job, _, { accessors }: EZContext): Promise<string> {
    const queue = accessors.getJobQueue(parent);
    if (queue) {
      const manager = accessors.getQueueManager(queue);
      return manager.id;
    }
    throw boom.notFound('Unexpected. Cannot find queue for job');
  },
};
