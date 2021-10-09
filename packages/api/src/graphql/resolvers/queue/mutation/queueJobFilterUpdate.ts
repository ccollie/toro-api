'use strict';
import boom from '@hapi/boom';
import { getJobFilter, updateJobFilter } from '@alpen/core';
import { EZContext } from 'graphql-ez';
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
    expression: 'String!',
  },
});

const JobFilterUpdatePayload = schemaComposer.createObjectTC({
  name: 'JobFilterUpdatePayload',
  fields: {
    filter: JobFilterTC,
    isUpdated: 'Boolean!',
  },
});

export const queueJobFilterUpdate: FieldConfig = {
  description: 'Update a job filter',
  type: JobFilterUpdatePayload.NonNull,
  args: {
    input: JobFilterUpdateTC.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, filterId, name, status, expression } = input;
    const queue = accessors.getQueueById(queueId);
    const filter = await getJobFilter(queue, filterId);

    if (!filter) {
      throw boom.notFound(
        `No job filter with id#${filterId} found for queue "${queue.name}"`,
      );
    }

    filter.expression = expression;
    filter.status = status;
    filter.name = name;

    const isUpdated = await updateJobFilter(queue, filter);
    return {
      filter,
      isUpdated,
    };
  },
};
