import { schemaComposer } from 'graphql-compose';

export const TimeSpanTC = schemaComposer.createObjectTC({
  name: 'TimeSpan',
  fields: {
    startTime: 'DateTime!',
    endTime: 'DateTime!',
  },
});
