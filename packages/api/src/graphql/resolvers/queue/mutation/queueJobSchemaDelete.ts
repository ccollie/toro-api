import { getQueueById } from '../../../helpers';
import { deleteJobSchema } from '@alpen/core';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const queueJobSchemaDelete: FieldConfig = {
  description: 'Delete a schema associated with a job name on a queue',
  type: schemaComposer.createObjectTC({
    name: 'QueueJobSchemaDeletePayload',
    fields: {
      jobName: 'String!',
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobSchemaDeleteInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String!',
      },
    }).NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName } = input;
    const queue = await getQueueById(queueId);

    const result = await deleteJobSchema(queue, jobName);

    if (!result) {
      throw boom.notFound(`No schema found for "${jobName}"`);
    }

    return {
      jobName,
      queue,
    };
  },
};
