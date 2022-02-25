import { Job } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { GetJobsByIdInput } from '../../typings';
import { FieldConfig } from '../utils';
import { schemaComposer } from 'graphql-compose';
import { JobTC } from '../job/query';

export const getJobsById: FieldConfig = {
  type: JobTC.NonNull.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'GetJobsByIdInput',
      fields: {
        queueId: 'ID!',
        ids: '[ID!]!',
      },
    }).NonNull,
  },
  async resolve(_, { input } : { input: GetJobsByIdInput }, context: EZContext): Promise<Job[]> {
    const { queueId, ids = [] } = input;
    const queue = context.accessors.getQueueById(queueId);
    const keys = ids.map((id) => ({ queue, id }));
    const res = await context.loaders.jobById.loadMany(keys);
    const jobs = res.filter((job) => !(job instanceof Error));
    return jobs as Job[];
  },
};
