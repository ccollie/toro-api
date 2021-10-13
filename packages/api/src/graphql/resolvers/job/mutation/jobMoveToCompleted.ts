import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig, QueueTC } from '../../index';
import { JobTC } from '../../index';
import { JobLocatorInput } from './jobLocatorInput';

export const jobMoveToCompleted: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobMoveToCompletedPayload',
    fields: {
      queue: QueueTC.NonNull,
      job: JobTC,
    },
  }).NonNull,
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId } = input;
    const queue = accessors.getQueueById(queueId, true);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.moveToCompleted({}, queue.token);
    }
    return {
      queue,
      job,
    };
  },
};
