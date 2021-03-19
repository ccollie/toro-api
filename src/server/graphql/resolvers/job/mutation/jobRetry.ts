import { FieldConfig, JobTC, QueueTC } from '../../index';
import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { processJobCommand } from '../../../../queues';
import { JobLocatorInput } from './jobLocatorInput';

export const jobRetry: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobRetryPayload',
    fields: {
      job: JobTC.NonNull,
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId } = input;
    const queue = await getQueueById(queueId);
    const job = await processJobCommand('retry', queue, jobId);
    return {
      job,
      queue,
    };
  },
};
