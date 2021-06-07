import { getQueueById } from '../../../helpers';
import { deleteJobFilter } from '@server/queues';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const queueJobFilterDelete: FieldConfig = {
  description: 'Delete a job filter',
  type: schemaComposer.createObjectTC({
    name: 'QueueJobFilterDeletePayload',
    fields: {
      filterId: 'String!',
      queue: QueueTC.NonNull,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobFilterDeleteInput',
      fields: {
        queueId: 'ID!',
        filterId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, filterId } = input;
    const queue = getQueueById(queueId);
    const result = await deleteJobFilter(queue, filterId);

    if (!result) {
      throw boom.notFound(`No filter found with id "${filterId}"`);
    }

    return {
      filterId,
      queue,
      isDelete: true,
    };
  },
};
