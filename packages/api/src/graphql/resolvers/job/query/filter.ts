import { GraphQLDate, schemaComposer } from 'graphql-compose';
import { JobType } from '../../../scalars';

export const JobFilterTC = schemaComposer.createObjectTC({
  name: 'JobFilter',
  description: 'Options for filtering queue jobs',
  fields: {
    id: 'ID!',
    name: {
      type: 'String!',
      description: 'A descriptive name of the filter',
    },
    status: {
      type: JobType,
      description: 'Optional job status to filter jobs by',
    },
    expression: {
      type: 'String!',
      makeRequired: true,
      description: 'The job filter query',
    },
    pattern: {
      type: 'String',
      description: 'The job filter pattern',
    },
    createdAt: {
      type: GraphQLDate,
      description: 'The date this filter was created',
    },
  },
});
