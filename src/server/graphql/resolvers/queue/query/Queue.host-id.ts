import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';

export const queueHostId: FieldConfig = {
  type: 'ID!',
  resolve: (queue: Queue) => {
    const manager = getQueueManager(queue);
    return manager?.hostManager.id;
  },
};
