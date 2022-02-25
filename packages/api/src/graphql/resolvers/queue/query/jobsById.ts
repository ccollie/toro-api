import { Queue, Job } from 'bullmq';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';

export const jobsById: FieldConfig = {
  type: '[Job!]!',
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobsByIdInput',
      fields: {
        ids: '[ID!]!',
      },
    }),
  },
  async resolve(queue: Queue, { input }, context): Promise<Job> {
    const { ids = [] } = input;
    const keys = ids.map((id) => ({ queue, id }));
    return context.loaders.jobById.loadMany(keys);
  },
};
