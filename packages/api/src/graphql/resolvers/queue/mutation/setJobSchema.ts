'use strict';
import { EZContext } from 'graphql-ez';
import { addJobSchema } from '@alpen/core';
import { FieldConfig, JobOptionsInputTC } from '../../index';
import { JobSchemaTC } from '../../job/query/schema';
import { schemaComposer } from 'graphql-compose';
import { JobSchema } from '../../../typings';

const JobSchemaInputTC = schemaComposer.createInputTC({
  name: 'JobSchemaInput',
  fields: {
    queueId: 'ID!',
    jobName: 'String!',
    schema: 'JSONSchema!',
    defaultOpts: JobOptionsInputTC,
  },
});

export const setJobSchema: FieldConfig = {
  description: 'Associate a JSON schema with a job name on a queue',
  type: JobSchemaTC.NonNull,
  args: {
    input: JobSchemaInputTC.NonNull,
  },
  resolve: async (
    _,
    { input },
    { accessors }: EZContext,
  ): Promise<JobSchema> => {
    const { queueId, jobName, schema, defaultOpts } = input;
    const queue = accessors.getQueueById(queueId, true);

    const _schema = await addJobSchema(queue, jobName, schema, defaultOpts);
    return {
      jobName,
      schema: _schema.schema,
      defaultOpts: _schema.defaultOpts,
    };
  },
};
