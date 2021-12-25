import { EZContext } from 'graphql-ez';
import { inferJobSchema as inferSchema, JobSchema } from '@alpen/core';
import { InferJobSchemaInput } from '../../typings';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobSchemaTC } from '../job/model/Job.schema';

export const inferJobSchema: FieldConfig = {
  type: JobSchemaTC,
  description: 'Infer a JSONSchema from completed jobs in a queue',
  args: {
    input: schemaComposer.createInputTC({
      name: 'InferJobSchemaInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String',
      },
    }),
  },
  async resolve(
    _,
    { input }: { input: InferJobSchemaInput },
    { accessors }: EZContext,
  ): Promise<JobSchema> {
    const { queueId, jobName } = input;
    const queue = accessors.getQueueById(queueId);

    return inferSchema(queue, jobName);
  },
};
