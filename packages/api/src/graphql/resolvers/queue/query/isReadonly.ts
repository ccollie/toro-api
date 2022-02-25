import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const isReadonly: FieldConfig = {
  type: 'Boolean!',
  resolve: (queue: Queue, _: unknown, { accessors }: EZContext) => {
    const manager = accessors.getQueueManager(queue);
    return manager.isReadonly;
  },
};
