import { EZContext } from 'graphql-ez';
import { inferJobSchema, JobSchema } from '@alpen/core/queues';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobSchemaTC } from '../job/model/Job.schema';

export const jobSchemaInfer: FieldConfig = {
  type: JobSchemaTC,
  description: 'Infer a JSONSchema from completed jobs in a queue',
  args: {
    input: schemaComposer.createInputTC({
      name: 'JobSchemaInferInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String',
      },
    }),
  },
  async resolve(_, { input }, { accessors }: EZContext): Promise<JobSchema> {
    const { queueId, jobName } = input;
    const queue = accessors.getQueueById(queueId);

    return inferJobSchema(queue, jobName);
  },
};
