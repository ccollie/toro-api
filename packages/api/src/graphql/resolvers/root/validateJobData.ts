import { EZContext } from 'graphql-ez';
import { getJobSchema, validateBySchema } from '@alpen/core';
import { JobsOptions } from 'bullmq';
import { FieldConfig, JobOptionsInputTC } from '../index';
import { schemaComposer } from 'graphql-compose';

function formatError(err): string[] {
  return [err.message];
}

export const validateJobData: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'ValidateJobDataResult',
    fields: {
      queueId: 'ID!',
      jobName: 'String!',
    },
  }).NonNull,
  description:
    'Validate job data against a schema previously defined on a queue',
  args: {
    input: schemaComposer.createInputTC({
      name: 'ValidateJobDataInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String!',
        data: 'JSONObject',
        opts: JobOptionsInputTC,
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, jobName, data = {}, opts = {} } = input;
    const queue = accessors.getQueueById(queueId);

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