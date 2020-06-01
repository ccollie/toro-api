import { schemaComposer } from 'graphql-compose';

export const JobLocatorInput = schemaComposer.createInputTC({
  name: 'JobLocatorInput',
  fields: {
    queueId: 'ID!',
    jobId: 'ID!',
  },
});
