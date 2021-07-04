import { schemaComposer } from 'graphql-compose';
import { JobTC } from '@server/graphql/resolvers';

export const JobNodeTC = schemaComposer.createObjectTC({
  name: 'JobNode',
  fields: {
    job: JobTC.NonNull,
    children: JobTC.NonNull.List,
  },
});
