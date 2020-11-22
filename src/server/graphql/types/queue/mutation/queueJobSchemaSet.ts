'use strict';
import { getQueueById } from '../../../helpers';
import { addJobSchema } from '../../../../queues';
import { FieldConfig, JobOptionsInputTC } from '../../index';
import { JobSchemaTC } from '../../job/model/Job.schema';
import { schemaComposer } from 'graphql-compose';

const JobSchemaInputTC = schemaComposer.createInputTC({
  name: 'JobSchemaInput',
  fields: {
    queueId: 'ID!',
    jobName: 'String!',
    schema: 'JSONSchema',
    defaultOpts: JobOptionsInputTC,
  },
});

export const queueJobSchemaSet: FieldConfig = {
  description: 'Associate a JSON schema with a job name on a queue',
  type: JobSchemaTC.NonNull,
  args: {
    input: JobSchemaInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, jobName, schema, defaultOpts } = input;
    const queue = await getQueueById(queueId);

    const _schema = await addJobSchema(queue, jobName, schema, defaultOpts);
    return {
      jobName,
      schema: _schema.schema,
      defaultOpts: _schema.defaultOpts,
    };
  },
};
