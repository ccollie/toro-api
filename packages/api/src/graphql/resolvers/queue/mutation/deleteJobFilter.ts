import { EZContext } from 'graphql-ez';
import { deleteJobFilter as deleteFilter } from '@alpen/core';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteJobFilter: FieldConfig = {
  description: 'Delete a job filter',
  type: schemaComposer.createObjectTC({
    name: 'DeleteJobFilterResult',
    fields: {
      filterId: 'String!',
      queue: QueueTC.NonNull,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteJobFilterInput',
      fields: {
        queueId: 'ID!',
        filterId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, filterId } = input;
    const queue = accessors.getQueueById(queueId, true);
    const result = await deleteFilter(queue, filterId);

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
