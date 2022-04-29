import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const metricCount: FieldConfig = {
  type: 'Int!',
  args: {},
  async resolve(queue: Queue, _, { accessors }: EZContext): Promise<number> {
    const manager = accessors.getQueueManager(queue);
    return manager.metricsManager.metrics.length;
  },
};
