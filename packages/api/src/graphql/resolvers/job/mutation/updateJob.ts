import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { validateJobData } from '@alpen/core';
import boom from '@hapi/boom';

const UpdateJobInput = schemaComposer.createInputTC({
  name: 'UpdateJobDataInput',
  fields: {
    queueId: 'ID!',
    jobId: 'ID!',
    data: {
      type: 'JSONObject!',
      description: 'the data that will replace the current jobs data.',
    },
  },
});

export const updateJob: FieldConfig = {
  description: 'Update job data',
  type: JobTC.NonNull,
  args: {
    input: UpdateJobInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId, data } = input;
    const queue = accessors.getQueueById(queueId, true);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw boom.notFound(`Job #${jobId} not found!`);
    }

    await validateJobData(queue, job.name, data);
    await job.update(data); // Data is completely replaced

    return job;
  },
};
