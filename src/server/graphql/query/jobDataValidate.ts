import { getQueueById } from '../helpers';
import { getJobSchema, validateBySchema } from '../../queues';
import { JobsOptions } from 'bullmq';
import { FieldConfig, JobOptionsInputTC } from '../types';
import { schemaComposer } from 'graphql-compose';

function formatError(err): string[] {
  return [err.message];
}

export const jobDataValidate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobDataValidatePayload',
    fields: {
      queueId: 'ID!',
      jobName: 'String!',
    },
  }).NonNull,
  description:
    'Validate job data against a schema previously defined on a queue',
  args: {
    input: schemaComposer.createInputTC({
      name: 'JobDataValidateInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String!',
        data: 'JSONObject',
        opts: JobOptionsInputTC,
      },
    }).NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName, data = {}, opts = {} } = input;
    const queue = getQueueById(queueId);

    const schema = await getJobSchema(queue, jobName);

    const result = {
      isValid: true,
      errors: [],
    };
    if (schema) {
      try {
        await validateBySchema(
          jobName,
          schema,
          data,
          opts as Partial<JobsOptions>,
        );
        result.isValid = true;
      } catch (err) {
        result.isValid = false;
        result.errors = formatError(err);
      }
    }
    return result;
  },
};
