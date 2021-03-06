import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { validateJobData } from '@server/queues';
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
  resolve: async (_, { input }) => {
    const { queueId, jobId, data } = input;
    const queue = await getQueueById(queueId);
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
