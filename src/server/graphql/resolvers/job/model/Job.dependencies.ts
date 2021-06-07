import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '@src/server/graphql/resolvers';
import { Job } from 'bullmq';

export const JoDependencyCursorInputTC = schemaComposer.createInputTC({
  name: 'JobDependencyCursorInput',
  fields: {
    cursor: 'Int',
    count: 'Int',
  },
});

export const JobDependenciesInputTC = schemaComposer.createInputTC({
  name: 'JobDependenciesOptsInput',
  fields: {
    processed: JoDependencyCursorInputTC,
    unprocessed: JoDependencyCursorInputTC,
  },
});

const JobDependenciesPayloadTC = schemaComposer.createObjectTC({
  name: 'JobDependenciesPayload',
  fields: {
    processed: 'JSONObject',
    unprocessed: '[String!]',
    nextProcessedCursor: 'Int',
    nextUnprocessedCursor: 'Int',
  },
});

export const dependencies: FieldConfig = {
  description:
    'Get children job keys if this job is a parent and has children.',
  type: JobDependenciesPayloadTC.NonNull,
  args: {
    input: JobDependenciesInputTC,
  },
  resolve: async (job: Job, { input }) => {
    const opts: Record<string, any> = input ?? {};
    return job.getDependencies(opts);
  },
};
