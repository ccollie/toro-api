import { GraphQLDate, schemaComposer } from 'graphql-compose';
import { GraphQLJobFilterQuery, JobStatusEnumType } from '../../scalars';

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
      type: JobStatusEnumType,
      description: 'Optional job status to filter jobs by',
    },
    expression: {
      type: GraphQLJobFilterQuery,
      makeRequired: true,
      description: 'A mongo compatible query filter',
    },
    createdAt: {
      type: GraphQLDate,
      description: 'The date this filter was created',
    },
  },
});
