import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';

export const jobChangeDelay: FieldConfig = {
  type: 'Job!',
  args: {
    input: schemaComposer.createInputTC({
      name: 'JobChangeDelayInput',
      fields: {
        queueId: 'String!',
        jobId: 'String!',
        delay: 'Int!',
      },
    }),
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId, delay } = input;
    const job = await accessors.getJobById(queueId, jobId, true);
    await job.changeDelay(delay);
    return job;
  },
};
