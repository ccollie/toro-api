import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { JobOptionsCronInputTC } from '../model/Job.opts';
import { addJob } from './utils';

const CreateRepeatableJobByCronInput = schemaComposer.createInputTC({
  name: 'CreateRepeatableJobByCronInput',
  fields: {
    queueId: 'ID!',
    jobName: 'ID!',
    data: 'JSONObject',
    options: {
      type: JobOptionsCronInputTC,
    },
  },
});

export const createRepeatableJobByCron: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'CreateRepeatableJobByCronResult',
    fields: {
      job: JobTC,
    },
  }).NonNull,
  args: {
    input: CreateRepeatableJobByCronInput.NonNull,
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
