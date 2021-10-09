import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, JobTC } from '../../index';
import { JobLocatorInput } from './jobLocatorInput';

export const jobDiscard: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobDiscardPayload',
    description:
      'Marks a job to not be retried if it fails (even if attempts has been configured)',
    fields: {
      job: JobTC.NonNull,
    },
  }).NonNull,
  args: {
    input: JobLocatorInput.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, jobId } = input;
    const job = await accessors.getJobById(queueId, jobId);
    await job.discard();

    return {
      job,
    };
  },
};
