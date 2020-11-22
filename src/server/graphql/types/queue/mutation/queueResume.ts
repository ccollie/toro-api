import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { FieldConfig, QueueTC } from '../../index';

export const queueResume: FieldConfig = {
  description: 'Resume a queue after being PAUSED.',
  type: schemaComposer.createObjectTC({
    name: 'QueueResumePayload',
    fields: {
      queue: QueueTC.NonNull,
      isPaused: 'Boolean!',
    },
  }).NonNull,
  args: {
    id: 'ID!',
  },
  resolve: async (_, { id }) => {
    const queue = await getQueueById(id);
    await queue.resume();
    return {
      queue,
      isPaused: false,
    };
  },
};
