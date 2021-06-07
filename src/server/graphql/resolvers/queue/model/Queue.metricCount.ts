import { Queue } from 'bullmq';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';

export const metricCount: FieldConfig = {
  type: 'Int!',
  args: {},
  async resolve(queue: Queue): Promise<number> {
    const manager = getQueueManager(queue);
    return manager.metricManager.metrics.length;
  },
};
