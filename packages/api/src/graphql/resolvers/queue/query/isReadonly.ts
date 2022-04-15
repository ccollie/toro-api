import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const isReadonly: FieldConfig = {
  type: 'Boolean!',
  description: 'Returns true if the queue is readonly',
  resolve: (queue: Queue, _: unknown, { accessors }: EZContext) => {
    const manager = accessors.getQueueManager(queue);
    return manager.isReadonly;
  },
};
