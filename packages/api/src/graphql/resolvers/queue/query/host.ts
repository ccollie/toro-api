import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const queueHostName: FieldConfig = {
  type: 'String!',
  resolve: (queue: Queue, _: unknown, { accessors }: EZContext) => {
    const manager = accessors.getQueueManager(queue);
    return manager?.hostManager.name;
  },
};
