import { EZContext } from 'graphql-ez';
import { getJobSchema, JobSchema } from '@alpen/core/queues';
import { FieldConfig } from '../index';
import { schemaComposer } from 'graphql-compose';
import { JobSchemaTC } from '../job/model/Job.schema';
import boom from '@hapi/boom';

export const queueJobSchema: FieldConfig = {
  type: JobSchemaTC,
  description:
    'Get a JSONSchema document previously set for a job name on a queue',
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueJobSchemaInput',
      fields: {
        queueId: 'ID!',
        jobName: 'String!',
      },
    }),
  },
  async resolve(_, { input }, { accessors }: EZContext): Promise<JobSchema> {
    const { queueId, jobName } = input;
    const queue = accessors.getQueueById(queueId);

    const schema = await getJobSchema(queue, jobName);
    if (!schema) {
      throw boom.notFound(`No schema found for job name ${jobName}`);
    }

    return schema;
  },
};
