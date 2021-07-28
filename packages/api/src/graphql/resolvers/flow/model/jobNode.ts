import { schemaComposer } from 'graphql-compose';
import { JobTC } from '../../index';

export const JobNodeTC = schemaComposer.createObjectTC({
  name: 'JobNode',
  fields: {
    job: JobTC.NonNull,
    children: JobTC.NonNull.List,
  },
});
