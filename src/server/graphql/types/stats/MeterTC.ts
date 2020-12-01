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
    currentRate: {
      type: 'Float!',
      description: 'the rate of the meter since the meter was started',
    },
    avg1Minute: {
      type: 'Float!',
      description: 'The 1 minute average',
    },
    avg5Minute: {
      type: 'Float!',
      description: 'The 5 minute average',
    },
    avg15Minute: {
      type: 'Float!',
      description: 'The 15 minute average',
    },
  },
});
