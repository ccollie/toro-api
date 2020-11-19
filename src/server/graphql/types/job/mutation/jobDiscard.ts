import { schemaComposer } from 'graphql-compose';
import { FieldConfig, JobTC } from '../../index';
import { getJobById } from '../../../helpers';
import { JobLocatorInput } from './jobLocatorInput';

export const jobDiscard: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobDiscardPayload',
    fields: {
      job: JobTC.NonNull,
    },
  }),
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobId } = input;
    const job = await getJobById(queueId, jobId);
    await job.discard();

    return {
      job
    };
  },
};
