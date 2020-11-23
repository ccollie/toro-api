import { schemaComposer } from 'graphql-compose';
import { StatsGranularityEnum } from '../scalars';

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
  ratePerSecond: {
    type: 'Float!',
  },
};

export const JobStatsInterfaceTC = schemaComposer.createInterfaceTC({
  name: 'JobStatsInterface',
  description: 'Base implementation for job stats information.',
  fields: BaseFields,
});

export const JobStatsThroughputTC = schemaComposer.createObjectTC({
  name: 'JobStatsThroughout',
  description: 'Job stats throughput',
  interfaces: [JobStatsInterfaceTC],
  fields: {
    ...BaseFields,
  },
});

export const JobStatsSnapshotTC = schemaComposer.createObjectTC({
  name: 'JobStatsSnapshot',
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
    p75: {
      type: 'Float!',
      description: 'The 25th percentile',
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

export const JobStatsQueryInputTC = schemaComposer.createInputTC({
  name: 'JobStatsQueryInput',
  description: 'Queue job stats filter.',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The queue to query',
    },
    jobName: {
      type: 'String',
      description: 'An optional job name to filter on',
    },
    granularity: {
      type: StatsGranularityEnum,
      description: 'Optional granularity',
    },
    rangeStart: {
      type: 'Date',
      description: 'The start of the range to query',
    },
    rangeEnd: {
      type: 'Date',
      description: 'Optional end of the range to query',
    },
  },
});

export const QueueStatsSpanPayload = schemaComposer.createObjectTC({
  name: 'QueueStatsSpanPayload',
  fields: {
    start: 'Date!',
    end: 'Date!',
  },
});

export const QueueStatsSpanInput = schemaComposer.createInputTC({
  name: 'QueueStatsSpanInput',
  fields: {
    queueId: 'ID!',
    jobName: 'String',
    granularity: StatsGranularityEnum,
  },
});
