import { schemaComposer } from 'graphql-compose';
import { GraphQLJSONSchema } from '../../../scalars';

export const JobSchemaTC = schemaComposer.createObjectTC({
  name: 'JobSchema',
  description: 'Options for validating job data',
  fields: {
    jobName: 'String!',
    schema: {
      type: GraphQLJSONSchema,
      description: 'The JSON schema associated with the job name',
    },
    defaultOpts: {
      type: 'JSONObject',
      description:
        'Default options for jobs off this type created through the API',
    },
  },
});
