import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const drainQueue: FieldConfig = {
  description:
    // eslint-disable-next-line max-len
    'Drains the queue, i.e., removes all jobs that are waiting or delayed, but not active, completed or failed.',
  type: schemaComposer.createObjectTC({
    name: 'DrainQueueResult',
    fields: {
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    id: 'ID!',
    delayed: {
      type: 'Boolean',
      defaultValue: false,
    },
  },
  resolve: async (_, { queueId, delayed }, { accessors }: EZContext) => {
    const queue = accessors.getQueueById(queueId, true);
    await queue.drain(delayed);
    return {
      queue,
    };
  },
};