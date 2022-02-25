import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { JobOptionsEveryInputTC } from '../../job/query/opts';
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

export const createRepeatableJob: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobAddEveryPayload',
    fields: {
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobAddEveryInput,
  },
  resolve: async (_, { input }, context: EZContext) => {
    const { queueId, jobName, data, options } = input;
    const queue = context.accessors.getQueueById(queueId, true);
    const job = await addJob(context, queue, jobName, data, options);
    return {
      job,
    };
  },
};
