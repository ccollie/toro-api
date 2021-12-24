import { EZContext } from 'graphql-ez';
import { deleteJobSchema as deleteSchema } from '@alpen/core';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteJobSchema: FieldConfig = {
  description: 'Delete a schema associated with a job name on a queue',
  type: schemaComposer.createObjectTC({
    name: 'DeleteJobSchemaResult',
    fields: {
      jobName: 'String!',
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteJobSchemaInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String!',
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, jobName } = input;
    const queue = accessors.getQueueById(queueId, true);

    const result = await deleteSchema(queue, jobName);

    if (!result) {
      throw boom.notFound(`No schema found for "${jobName}"`);
    }

    return {
      jobName,
      queue,
    };
  },
};
