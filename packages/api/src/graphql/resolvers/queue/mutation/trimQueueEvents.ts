import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const trimQueueEvents: FieldConfig = {
  description: 'Trim the event stream to an approximately maxLength.',
  type: QueueTC.NonNull,
  args: {
    id: 'ID!',
    maxLength: {
      type: 'Int'
    },
  },
  resolve: async (_, { id, maxLength }, { accessors }: EZContext): Promise<number> => {
    const queue = accessors.getQueueById(id, true);
    return queue.trimEvents(maxLength);
  },
};
