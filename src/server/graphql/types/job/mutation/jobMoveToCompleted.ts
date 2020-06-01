import { getQueueById } from '../../../helpers';
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
  }),
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId } = input;
    const queue = await getQueueById(queueId);
    const job = await queue.getJob(jobId);
    if (job) {
      const token = `token-${Math.random()}`;
      await job.moveToCompleted({}, token);
    }
    return {
      queue,
      job,
    };
  },
};
