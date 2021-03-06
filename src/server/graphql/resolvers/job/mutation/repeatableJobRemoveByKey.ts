import { schemaComposer } from 'graphql-compose';
import { FieldConfig, QueueTC } from '../../index';
import { getQueueById } from '../../../helpers';

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
  resolve: async (_, { input }) => {
    const { queueId, key } = input;
    const queue = getQueueById(queueId);
    await queue.removeRepeatableByKey(key);
    return {
      key,
      queue,
    };
  },
};
