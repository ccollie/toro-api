import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { JobTC, FieldConfig } from '../../index';
import { addJob } from './utils';

const CreateJobInput = schemaComposer.createInputTC({
  name: 'CreateJobInput',
  fields: {
    queueId: 'ID!',
    jobName: 'String!',
    data: 'JSONObject',
    options: 'JobOptionsInput',
  },
});

export const createJob: FieldConfig = {
  type: JobTC.NonNull,
  args: {
    input: CreateJobInput,
  },
  resolve: async (_, { input }, context: EZContext) => {
    const { queueId, jobName, data, options } = input;
    const queue = context.accessors.getQueueById(queueId, true);

    return addJob(context, queue, jobName, data, options);
  },
};
