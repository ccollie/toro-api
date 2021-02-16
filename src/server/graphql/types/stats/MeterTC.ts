import { schemaComposer } from 'graphql-compose';

export const MeterTC = schemaComposer.createObjectTC({
  name: 'Meter',
  description:
    'Records the rate of events over an interval using an exponentially moving average',
  fields: {
    count: {
      type: 'Int!',
      description: 'The number of samples.',
    },
    meanRate: {
      type: 'Float!',
      description: 'The average rate since the meter was started.',
    },
    m1Rate: {
      type: 'Float!',
      description: 'The 1 minute average',
    },
    m5Rate: {
      type: 'Float!',
      description: 'The 5 minute average',
    },
    m15Rate: {
      type: 'Float!',
      description: 'The 15 minute average',
    },
  },
});
