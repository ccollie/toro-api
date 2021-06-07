import { getQueueById } from '../../../helpers';
import { FieldConfig, QueueTC } from '../../index';

export const queuePause: FieldConfig = {
  description:
    'Pause the queue.\n' +
    '\n' +
    'A PAUSED queue will not process new jobs until resumed, but current jobs being processed ' +
    'will continue until they are finalized.',
  type: QueueTC.NonNull,
  args: {
    id: 'ID!',
  },
  resolve: async (_, { id }) => {
    const queue = await getQueueById(id);
    await queue.pause();
    return queue;
  },
};
