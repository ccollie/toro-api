import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobOptionsInputTC, JobTC, FieldConfig } from '../../index';
import boom from '@hapi/boom';
import { createBulkJobs } from '../../../../queues';
import { publishJobAdded } from '../subscription/onJobAdded';

export const jobAddBulk: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobAddBulkPayload',
    fields: {
      jobs: JobTC.List.NonNull,
    },
  }),
  args: {
    queueId: 'String!',
    jobs: schemaComposer.createInputTC({
      name: 'BulkJobItemInput',
      fields: {
        name: 'String!',
        data: 'JSONObject!',
        options: JobOptionsInputTC,
      },
    }).List.NonNull,
  },
  resolve: async (_, { queueId, jobs }) => {
    const queue = await getQueueById(queueId);
    // todo: handle job schemas
    if (!Array.isArray(jobs) || !jobs.length) {
      throw boom.badRequest(
        'At least 1 job must be specified to "addBulkJobs"',
      );
    }
    const jobsRes = await createBulkJobs(queue, jobs);
    await publishJobAdded(queue, jobsRes);

    return {
      jobs: jobsRes,
    };
  },
};
