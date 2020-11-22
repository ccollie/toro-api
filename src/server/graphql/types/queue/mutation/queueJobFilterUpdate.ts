'use strict';
import boom from '@hapi/boom';
import { getQueueById } from '../../../helpers';
import { getJobFilter, updateJobFilter } from '../../../../queues';
import { FieldConfig, JobStatusEnumType } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { JobFilterTC } from '../../job/model/Job.filter';

const JobFilterUpdateTC = schemaComposer.createInputTC({
  name: 'JobFilterUpdateInput',
  fields: {
    queueId: 'ID!',
    filterId: 'ID!',
    name: 'String',
    status: JobStatusEnumType,
    expression: 'JSON!',
  },
});

const JobFilterUpdatePayload = schemaComposer.createObjectTC({
  name: 'JobFilterUpdatePayload',
  fields: {
    filter: JobFilterTC,
    isUpdated: 'Boolean!',
  },
});

export const queueJobFilterCreate: FieldConfig = {
  description: 'Update a job filter',
  type: JobFilterUpdatePayload.NonNull,
  args: {
    input: JobFilterUpdateTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, filterId, name, status, expression } = input;
    const queue = await getQueueById(queueId);
    const filter = await getJobFilter(queue, filterId);

    if (!filter) {
      throw boom.notFound(
        `No job filter with id#${filterId} found for queue "${queue.name}"`,
      );
    }

    filter.expression = expression;
    filter.status = status;
    filter.name = name;

    const isUpdated = updateJobFilter(queue, filter);
    return {
      filter,
      isUpdated,
    };
  },
};
