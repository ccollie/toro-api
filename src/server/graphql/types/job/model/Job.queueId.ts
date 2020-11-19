import { Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';

export const jobQueueIdFC: FieldConfig = {
  type: 'String',
  async resolve(parent: Job): Promise<string> {
    let queueId = (parent as any).queueId;
    if (!queueId) {
      const queue = (parent as any).queue;
      const manager = getQueueManager(queue);
      queueId = manager.id;
    }
    return queueId;
  },
};
