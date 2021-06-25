import { schemaComposer } from 'graphql-compose';
import { JobTC } from '@server/graphql/resolvers';

export const JobNodeTC = schemaComposer.createObjectTC({
  name: 'JobNode',
  description: 'A tree-like structure of jobs that depend on each other.',
  fields: {
    job: JobTC.NonNull,
    children: JobTC.List,
  },
});
