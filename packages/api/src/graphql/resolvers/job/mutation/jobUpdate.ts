import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { validateJobData } from '@alpen/core';
import boom from '@hapi/boom';

const JobUpdateInput = schemaComposer.createInputTC({
  name: 'JobUpdateInput',
  fields: {
    queueId: 'String!',
    jobId: 'String!',
    data: 'JSONObject!',
  },
});

export const jobUpdate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobUpdatePayload',
    fields: {
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobUpdateInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId, data } = input;
    const queue = accessors.getQueueById(queueId, true);
    let job = await queue.getJob(jobId);
    if (!job) {
      throw boom.notFound(`Job #${jobId} not found!`);
    }

    await validateJobData(queue, job.name, data);
    await job.update(data); // Data is completely replaced

    job = await queue.getJob(jobId);

    return {
      job,
    };
  },
};
