import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const queueResume: FieldConfig = {
  description: 'Resume a queue after being PAUSED.',
  type: QueueTC.NonNull,
  args: {
    id: 'ID!',
  },
  resolve: async (_, { id }, { accessors }: EZContext) => {
    const queue = accessors.getQueueById(id, true);
    await queue.resume();
    return queue;
  },
};
