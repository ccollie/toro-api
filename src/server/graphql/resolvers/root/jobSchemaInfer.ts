import { getQueueById } from '../../helpers';
import { inferJobSchema, JobSchema } from '../../../queues';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobSchemaTC } from '../job/query/Job.schema';

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
  async resolve(_, { input }): Promise<JobSchema> {
    const { queueId, jobName } = input;
    const queue = getQueueById(queueId);

    return inferJobSchema(queue, jobName);
  },
};
