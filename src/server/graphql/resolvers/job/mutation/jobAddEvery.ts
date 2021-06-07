import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { JobOptionsEveryInputTC } from '../model/Job.opts';
import { addJob } from './utils';

const JobAddEveryInput = schemaComposer.createInputTC({
  name: 'JobAddEveryInput',
  fields: {
    queueId: 'ID!',
    jobName: 'ID!',
    data: 'JSONObject',
    options: {
      type: JobOptionsEveryInputTC,
    },
  },
});

export const jobAddEvery: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobAddEveryPayload',
    fields: {
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobAddEveryInput,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobName, data, options } = input;
    const queue = await getQueueById(queueId);
    const job = await addJob(queue, jobName, data, options);
    return {
      job,
    };
  },
};
