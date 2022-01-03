import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';
import { JobTC } from '../../index';

export const moveJobToFailed: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'MoveoJobToFailedResult',
    fields: {
      job: JobTC.NonNull,
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'MoveJobToFailedInput',
      fields: {
        queueId: 'ID!',
        jobId: 'ID!',
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
