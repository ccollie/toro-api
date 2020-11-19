import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { processJobCommand } from '../../../../queues';
import { JobLocatorInput } from './jobLocatorInput';

export const jobPromote: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobPromotePayload',
    fields: {
      job: JobTC.NonNull,
      queue: QueueTC.NonNull,
    },
  }),
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId } = input;
    const queue = await getQueueById(queueId);
    const job = await processJobCommand('promote', queue, jobId);
    return {
      queue,
      job
    };
  },
};
