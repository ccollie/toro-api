import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { processJobCommand } from '@alpen/core';
import { JobLocatorInput } from './jobLocatorInput';

export const jobPromote: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobPromotePayload',
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
    const queue = accessors.getQueueById(queueId);
    const job = await processJobCommand('promote', queue, jobId);
    return {
      queue,
      job,
    };
  },
};
