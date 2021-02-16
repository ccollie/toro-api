import { FieldConfig } from '../../utils';
import { getJobSchemas } from '../../../../queues';
import { Queue } from 'bullmq';
import { JobSchemaTC } from '../../job/model/Job.schema';

export const queueJobSchemas: FieldConfig = {
  type: JobSchemaTC.NonNull.List.NonNull,
  args: {
    jobNames: '[String!]',
  },
  description:
    'Get JSONSchema documents and job defaults previously set for a job names on a queue',
  async resolve(
    queue: Queue,
    { jobNames }: { jobNames: string[] },
  ): Promise<any[]> {
    const schemas = await getJobSchemas(queue, jobNames);
    // translate for output
    return Object.entries(schemas).map(([jobName, schema]) => {
      return {
        jobName,
        schema: schema.schema,
        defaultOpts: schema.defaultOpts,
      };
    });
  },
};
