import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { JobOptionsInputTC, JobTC, FieldConfig } from '../../index';
import boom from '@hapi/boom';
import { createBulkJobs as createJobs } from '@alpen/core';
import { publishJobAdded } from '../subscription/onJobAdded';

export const bulkCreateJobs: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'CreateBulkJobsResult',
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
    const jobsRes = await createJobs(queue, jobs);
    await publishJobAdded(context, queue, jobsRes);

    return {
      jobs: jobsRes,
    };
  },
};