'use strict';
import { getQueueById } from '../../../helpers';
import { addJobFilter } from '@server/queues';
import { FieldConfig, JobStatusEnumType } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { JobFilterTC } from '../../job/model/Job.filter';

const JobFilterInputTC = schemaComposer.createInputTC({
  name: 'JobFilterInput',
  fields: {
    queueId: 'ID!',
    name: 'String!',
    status: JobStatusEnumType,
    expression: 'String!',
  },
});

export const queueJobFilterCreate: FieldConfig = {
  description: 'Add a named job filter',
  type: JobFilterTC.NonNull,
  args: {
    input: JobFilterInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, name, status, expression } = input;
    const queue = await getQueueById(queueId);

    return addJobFilter(queue, name, status, expression);
  },
};
