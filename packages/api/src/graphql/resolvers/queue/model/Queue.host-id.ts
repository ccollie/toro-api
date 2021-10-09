import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const queueHostId: FieldConfig = {
  type: 'ID!',
  resolve: (queue: Queue, _, { accessors }: EZContext) => {
    const manager = accessors.getQueueManager(queue);
    return manager?.hostManager.id;
  },
};
