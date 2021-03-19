import { FieldConfig } from '../';
import { StatsMetricsTypeEnum } from '../scalars';
import { schemaComposer } from 'graphql-compose';
import { getSnapshotPercentileDistribution } from '../../../stats/percentile-distribution';
import { aggregateStats } from './utils';

const PercentileDistributionInput = schemaComposer.createInputTC({
  name: 'PercentileDistributionInput',
  description: 'Records histogram binning data',
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
    percentiles: {
      type: '[Float!]!',
      defaultValue: [0.5, 0.75, 0.9, 0.95, 0.99, 0.995],
      description: 'The percentiles to get frequencies for',
    },
  },
});

const PercentileDistribution = schemaComposer.createObjectTC({
  name: 'PercentileDistribution',
  description: 'Percentile distribution of metric values',
  fields: {
    totalCount: {
      type: 'Int!',
      description: 'The total number of values.',
    },
    min: {
      type: 'Float!',
      description: 'The minimum value in the data range.',
    },
    max: {
      type: 'Float!',
      description: 'The maximum value in the data range.',
    },
    percentiles: schemaComposer.createObjectTC({
      name: 'PercentileCount',
      fields: {
        count: 'Int!',
        value: {
          type: 'Float!',
          description: 'The percentile value',
        },
      },
    }).List.NonNull,
  },
});

export const percentileDistribution: FieldConfig = {
  type: PercentileDistribution.NonNull,
  description: 'Compute a percentile distribution.',
  args: {
    input: PercentileDistributionInput.NonNull,
  },
  async resolve(_, { input }) {
    const { jobName, metric, granularity, range, percentiles } = input;

    const snapshot = await aggregateStats(
      _,
      jobName,
      range,
      metric,
      granularity,
    );

    return getSnapshotPercentileDistribution(snapshot, percentiles);
  },
};
