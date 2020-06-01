import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';

export const queueWorkerCount: FieldConfig = {
  type: 'Int!',
  async resolve(queue: Queue): Promise<number> {
    const manager = getQueueManager(queue);
    return manager.getWorkerCount();
  },
};
