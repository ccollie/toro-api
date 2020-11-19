import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { FieldConfig, QueueTC } from '../../index';

export const queueDrain: FieldConfig = {
  description:
    // eslint-disable-next-line max-len
    'Drains the queue, i.e., removes all jobs that are waiting or delayed, but not active, completed or failed.',
  type: schemaComposer.createObjectTC({
    name: 'QueueDrainPayload',
    fields: {
      queue: QueueTC.NonNull,
    },
  }),
  args: {
    id: 'ID!',
    delayed: {
      type: 'Boolean',
      defaultValue: false,
    },
  },
  resolve: async (_, { queueId, delayed }) => {
    const queue = await getQueueById(queueId);
    await queue.drain(delayed);
    return {
      queue,
    };
  },
};
