import { EZContext } from 'graphql-ez';
import { getJobFilter } from '@alpen/core/queues';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';
import { JobFilterTC } from '../job/model/Job.filter';

export const queueJobFilter: FieldConfig = {
  type: JobFilterTC,
  description: 'Get a queue JobFilter by id',
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobFilterInput',
      fields: {
        queueId: 'ID!',
        fieldId: 'ID!',
      },
    }),
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, fieldId } = input;
    const queue = accessors.getQueueById(queueId);

    const filter = await getJobFilter(queue, fieldId);
    if (!filter) {
      throw boom.notFound(`No filter found with id ${fieldId}`);
    }

    return filter;
  },
};
