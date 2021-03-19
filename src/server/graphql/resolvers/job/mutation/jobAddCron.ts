import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { JobOptionsCronInputTC } from '../query/Job.opts';
import { addJob } from './utils';

const JobAddCronInput = schemaComposer.createInputTC({
  name: 'JobAddCronInput',
  fields: {
    queueId: 'ID!',
    jobName: 'ID!',
    data: 'JSONObject',
    options: {
      type: JobOptionsCronInputTC,
    },
  },
});

export const jobAddCron: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobAddCronPayload',
    fields: {
      job: JobTC,
    },
  }).NonNull,
  args: {
    input: JobAddCronInput.NonNull,
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
