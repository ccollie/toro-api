import { getQueueById } from '../../helpers';
import { inferJobSchema, JobSchema } from '@src/server/queues';
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
  async resolve(_, { input }): Promise<JobSchema> {
    const { queueId, jobName } = input;
    const queue = getQueueById(queueId);

    return inferJobSchema(queue, jobName);
  },
};
