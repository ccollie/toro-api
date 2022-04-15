'use strict';
import boom from '@hapi/boom';
import { getJobFilter, updateJobFilter as updateFilter } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { FieldConfig, JobType } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { JobFilterTC } from '../../job/query/filter';

const UpdateJobFilterInput = schemaComposer.createInputTC({
  name: 'UpdateJobFilterInput',
  fields: {
    queueId: 'ID!',
    filterId: 'ID!',
    name: 'String',
    status: JobType,
    expression: 'String!',
  },
});

const UpdateJobFilterResult = schemaComposer.createObjectTC({
  name: 'UpdateJobFilterResult',
  fields: {
    filter: JobFilterTC,
    isUpdated: 'Boolean!',
  },
});

export const updateJobFilter: FieldConfig = {
  description: 'Update a job filter',
  type: UpdateJobFilterResult.NonNull,
  args: {
    input: UpdateJobFilterInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, filterId, name, status, expression } = input;
    const queue = accessors.getQueueById(queueId, true);
    const filter = await getJobFilter(queue, filterId);

    if (!filter) {
      throw boom.notFound(
        `No job filter with id#${filterId} found for queue "${queue.name}"`,
      );
    }

    filter.expression = expression;
    filter.status = status;
    filter.name = name;

    const isUpdated = await updateFilter(queue, filter);
    return {
      filter,
      isUpdated,
    };
  },
};
