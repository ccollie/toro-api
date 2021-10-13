import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';
import { JobTC } from '../../index';

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
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId, reason = 'Failed by user' } = input;
    const job = await accessors.getJobById(queueId, jobId, true);

    const err = new Error(reason);
    const queue = accessors.getQueueById(queueId);
    await job.moveToFailed(err, queue.token, false);
    return {
      queue,
      job,
    };
  },
};
