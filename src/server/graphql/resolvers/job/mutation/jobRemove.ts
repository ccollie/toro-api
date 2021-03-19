import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobTC, FieldConfig, QueueTC } from '../../index';
import { processJobCommand } from '../../../../queues';
import { JobLocatorInput } from './jobLocatorInput';

export const jobRemove: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobRemovePayload',
    fields: {
      queue: QueueTC.NonNull,
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId } = input;
    const queue = await getQueueById(queueId);
    const job = await processJobCommand('remove', queue, jobId);

    return {
      queue,
      job,
    };
  },
};
