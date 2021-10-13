import { EZContext } from 'graphql-ez';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { processJobCommand } from '@alpen/core/queues';
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
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId } = input;
    const queue = accessors.getQueueById(queueId, true);
    const job = await processJobCommand('retry', queue, jobId);
    return {
      job,
      queue,
    };
  },
};
