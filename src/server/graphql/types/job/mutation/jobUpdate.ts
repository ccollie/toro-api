import { MutationError, ErrorCodeEnum } from '../../../helpers';
import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig } from '../../index';
import { validateJobData } from '../../../../queues';

const JobUpdateInput = schemaComposer.createInputTC({
  name: 'JobUpdateInput',
  fields: {
    queueId: 'String!',
    jobId: 'String!',
    data: 'JSONObject!',
  }
});

export const jobUpdate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobUpdatePayload',
    fields: {
      job: JobTC,
    },
  }),
  args: {
    input: JobUpdateInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId, data } = input;
    const queue = await getQueueById(queueId);
    let job = await queue.getJob(jobId);
    if (!job)
      throw new MutationError('Job not found!', ErrorCodeEnum.JOB_NOT_FOUND);

    await validateJobData(queue, job.name, data);
    await job.update(data); // Data is completely replaced

    job = await queue.getJob(jobId);

    return {
      job,
    };
  },
};
