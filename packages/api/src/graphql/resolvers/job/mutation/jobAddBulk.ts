import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobOptionsInputTC, JobTC, FieldConfig } from '../../index';
import boom from '@hapi/boom';
import { createBulkJobs } from '@alpen/core';
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
  resolve: async (_, { queueId, jobs }, context: EZContext) => {
    const queue = context.accessors.getQueueById(queueId, true);
    // todo: handle job schemas
    if (!Array.isArray(jobs) || !jobs.length) {
      throw boom.badRequest(
        'At least 1 job must be specified to "addBulkJobs"',
      );
    }
    const jobsRes = await createBulkJobs(queue, jobs);
    await publishJobAdded(context, queue, jobsRes);

    return {
      jobs: jobsRes,
    };
  },
};
