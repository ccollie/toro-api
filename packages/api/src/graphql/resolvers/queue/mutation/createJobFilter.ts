'use strict';
import { EZContext } from 'graphql-ez';
import { addJobFilter } from '@alpen/core';
import { FieldConfig, JobStatusEnumType } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { JobFilterTC } from '../../job/model/Job.filter';

const CreateJobFilterInput = schemaComposer.createInputTC({
  name: 'CreateJobFilterInput',
  fields: {
    queueId: 'ID!',
    name: 'String!',
    status: JobStatusEnumType,
    expression: 'String!',
  },
});

export const createJobFilter: FieldConfig = {
  description: 'Add a named job filter',
  type: JobFilterTC.NonNull,
  args: {
    input: CreateJobFilterInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, name, status, expression } = input;
    const queue = accessors.getQueueById(queueId, true);

    return addJobFilter(queue, name, status, expression);
  },
};
