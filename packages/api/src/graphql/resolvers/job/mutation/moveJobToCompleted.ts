import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { JobLocatorInput } from './jobLocatorInput';

export const moveJobToCompleted: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'MoveJobToCompletedResult',
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
