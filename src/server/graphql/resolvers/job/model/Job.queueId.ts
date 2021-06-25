import boom from '@hapi/boom';
import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getJobQueue, getQueueManager } from '../../../helpers';

export const jobQueueIdFC: FieldConfig = {
  type: 'String!',
  makeNonNull: true,
  async resolve(parent: Job): Promise<string> {
    const queue = getJobQueue(parent);
    if (queue) {
      const manager = getQueueManager(queue);
      return manager.id;
    }
    throw boom.notFound('Unexpected. Cannot find queue for job');
  },
};
