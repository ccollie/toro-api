import { schemaComposer } from 'graphql-compose';
import { StatsMetricsTypeEnum } from '../scalars';

const BaseFields = {
  count: {
    type: 'Int!',
    description: 'The sample size',
  },
  failed: {
    type: 'Int!',
    description: 'The number of failed jobs in the sample interval',
  },
  completed: {
    type: 'Int!',
    description: 'The number of completed jobs in the sample interval',
  },
  startTime: {
    type: 'Date!',
    description: 'The start of the interval',
  },
  endTime: {
    type: 'Date!',
    description: 'The end of the interval',
  },
};

export const JobStatsInterfaceTC = schemaComposer.createInterfaceTC({
  name: 'JobStatsInterface',
  description: 'Base implementation for job stats information.',
  fields: BaseFields,
});

schemaComposer.createObjectTC({
  name: 'JobStatsThroughout',
  description: 'Job stats throughput',
  interfaces: [JobStatsInterfaceTC],
  fields: {
    ...BaseFields,
  },
});

export const StatsSnapshotTC = schemaComposer.createObjectTC({
  name: 'StatsSnapshot',
  description: 'Queue job stats snapshot.',
  interfaces: [JobStatsInterfaceTC],
  fields: {
    ...BaseFields,
    mean: {
      type: 'Float!',
      description: 'The average of values during the period',
    },
    stddev: {
      type: 'Float!',
      description:
        'The standard deviation of the dataset over the sample period',
    },
    min: {
      type: 'Float!',
      description: 'The minimum value in the data set',
    },
    max: {
      type: 'Float!',
      description: 'The maximum value in the data set',
    },
    median: {
      type: 'Float!',
      description: 'The median value of the data set',
    },
    p90: {
      type: 'Float!',
      description: 'The 25th percentile',
    },
    p95: {
      type: 'Float!',
      description: 'The 95th percentile',
    },
    p99: {
      type: 'Float!',
      description: 'The 99th percentile',
    },
    p995: {
      type: 'Float!',
      description: 'The 99.5th percentile',
    },
  },
});

export const StatsQueryInputTC = schemaComposer.createInputTC({
  name: 'StatsQueryInput',
  description: 'Queue stats filter.',
  fields: {
    jobName: {
      type: 'String',
      description: 'An optional job name to filter on',
    },
    metric: {
      type: StatsMetricsTypeEnum,
      makeRequired: true,
      defaultValue: 'latency',
      description: 'The metric requested',
    },
    granularity: {
      type: 'StatsGranularity!',
      description: 'Stats snapshot granularity',
    },
    range: {
      type: 'String!',
      description:
        'An expression specifying the range to query e.g. yesterday, last_7days',
    },
  },
});
