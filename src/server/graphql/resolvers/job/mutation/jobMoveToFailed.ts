import { schemaComposer } from 'graphql-compose';
import { FieldConfig, QueueTC } from '../../index';
import { JobTC } from '../../index';
import { getJobById, getQueueById } from '../../../helpers';

export const jobMoveToFailed: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobMoveToFailedPayload',
    fields: {
      job: JobTC.NonNull,
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'JobMoveToFailedInput',
      fields: {
        queueId: 'String!',
        jobId: 'String!',
        failedReason: 'String',
      },
    }),
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId, reason = 'Failed by user' } = input;
    const job = await getJobById(queueId, jobId);

    const err = new Error(reason);
    const queue = getQueueById(queueId);
    await job.moveToFailed(err, queue.token, false);
    return {
      queue,
      job,
    };
  },
};
