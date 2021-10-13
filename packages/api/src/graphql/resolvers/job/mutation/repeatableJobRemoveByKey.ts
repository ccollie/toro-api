import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const repeatableJobRemoveByKey: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RepeatableJobRemoveByKeyPayload',
    fields: {
      key: 'String!',
      queue: QueueTC,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'RepeatableJobRemoveByKeyInput',
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
