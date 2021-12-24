import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const deleteRepeatableJobByKey: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'DeleteRepeatableJobByKeyResult',
    fields: {
      key: 'String!',
      queue: QueueTC,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteRepeatableJobByKeyInput',
      fields: {
        queueId: 'ID!',
        key: 'String!',
      },
    }).NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, key } = input;
    const queue = accessors.getQueueById(queueId, true);
    await queue.removeRepeatableByKey(key);
    return {
      key,
      queue,
    };
  },
};
