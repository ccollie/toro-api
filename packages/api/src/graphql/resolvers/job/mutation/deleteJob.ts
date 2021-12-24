import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig, QueueTC } from '../../index';
import { processJobCommand } from '@alpen/core';
import { JobLocatorInput } from './jobLocatorInput';

export const deleteJob: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'DeleteJobPayload',
    fields: {
      queue: QueueTC.NonNull,
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId } = input;
    const queue = accessors.getQueueById(queueId, true);
    const job = await processJobCommand('remove', queue, jobId);

    return {
      queue,
      job,
    };
  },
};
