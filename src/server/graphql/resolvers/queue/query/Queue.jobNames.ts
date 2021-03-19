import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';

export const jobNames: FieldConfig = {
  type: '[String!]!',
  async resolve(queue: Queue): Promise<string[]> {
    const manager = getQueueManager(queue);
    return manager.getJobTypes();
  },
};
