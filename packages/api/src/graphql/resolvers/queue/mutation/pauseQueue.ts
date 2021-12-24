import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const pauseQueue: FieldConfig = {
  description:
    'Pause the queue.\n' +
    '\n' +
    'A PAUSED queue will not process new jobs until resumed, but current jobs being processed ' +
    'will continue until they are finalized.',
  type: QueueTC.NonNull,
  args: {
    id: 'ID!',
  },
  resolve: async (_, { id }, { accessors }: EZContext) => {
    const queue = accessors.getQueueById(id, true);
    await queue.pause();
    return queue;
  },
};
