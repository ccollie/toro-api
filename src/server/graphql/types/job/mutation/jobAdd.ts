import { schemaComposer } from 'graphql-compose';
import { JobOptionsInputTC, JobTC, FieldConfig } from '../../index';
import { getQueueById } from '../../../helpers';
import { addJob } from './utils';

const JobAddInput = schemaComposer.createInputTC({
  name: 'JobAddInput',
  fields: {
    queueId: 'ID!',
    jobName: 'String!',
    data: 'JSONObject',
    options: {
      type: JobOptionsInputTC
    },
  },
});

export const jobAdd: FieldConfig = {
  type: JobTC.NonNull,
  args: {
    input: JobAddInput,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobName, data, options } = input
    const queue = await getQueueById(queueId);

    return addJob(queue, jobName, data, options);
  },
};
