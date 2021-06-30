import { schemaComposer } from 'graphql-compose';
import { PeakSignalDirectionEnum, StatsMetricsTypeEnum } from '../scalars';
import { GraphQLEnumType } from 'graphql';
import { StatsRateType } from '@src/types';

/* eslint max-len: 0 */

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
    meanRate: {
      type: 'Float!',
      description:
        'The average rate of events over the entire lifetime of measurement (e.g., the total number of requests handled,' +
        'divided by the number of seconds the process has been running), it doesn’t offer a sense of recency.',
    },
    m1Rate: {
      type: 'Float!',
      description: 'One minute exponentially weighted moving average',
    },
    m5Rate: {
      type: 'Float!',
      description: 'Five minute exponentially weighted moving average',
    },
    m15Rate: {
      type: 'Float!',
      description: 'Fifteen minute exponentially weighted moving average',
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

export const StatsRateTypeEnum = new GraphQLEnumType({
  name: 'StatsRateType',
  values: {
    [StatsRateType.Throughput]: { value: StatsRateType.Throughput },
    [StatsRateType.Errors]: { value: StatsRateType.Errors },
    [StatsRateType.ErrorPercentage]: { value: StatsRateType.ErrorPercentage },
  },
});

export const StatsRateQueryInputTC = schemaComposer.createInputTC({
  name: 'StatsRateQueryInput',
  description: 'Queue stats rates filter.',
  fields: {
    jobName: {
      type: 'String',
      description: 'An optional job name to filter on',
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

const TimeseriesDataFields = {
  ts: {
    type: 'Timestamp!',
    description: 'The timestamp of when the event occurred',
  },
  value: {
    type: 'Float!',
    description: 'The value at the given timestamp',
  },
};

export const TimeseriesDataPointInterface = schemaComposer.createInterfaceTC({
  name: 'TimeseriesDataPointInterface',
  description:
    'A data point representing the value of a metric in a time series.',
  fields: TimeseriesDataFields,
});

export const TimeseriesDataPointTC = schemaComposer.createObjectTC({
  name: 'TimeseriesDataPoint',
  interfaces: [TimeseriesDataPointInterface],
  fields: TimeseriesDataFields,
});

export const PeakDataPointTC = schemaComposer.createObjectTC({
  name: 'PeakDataPoint',
  interfaces: [TimeseriesDataPointInterface],
  fields: {
    ...TimeseriesDataFields,
    signal: {
      type: PeakSignalDirectionEnum.NonNull,
    },
  },
});

export const SummaryStatisticsTC = schemaComposer.createObjectTC({
  name: 'SummaryStatistics',
  description: 'Basic descriptive statistics',
  fields: {
    count: {
      type: 'Int!',
      description: 'The number of input values included in calculations',
    },
    min: {
      type: 'Float',
      description: 'The minimum value.',
    },
    max: {
      type: 'Float',
      description: 'The maximum value.',
    },
    mean: {
      type: 'Float!',
      description:
        'The average value - the sum of all values over the number of values.',
    },
    median: {
      type: 'Float',
      description:
        'The median is the middle number of a list. This is often a good indicator of "the middle" when ' +
        'there are outliers that skew the mean value.',
    },
    variance: {
      type: 'Float!',
      description:
        'The variance is the sum of squared deviations from the mean.',
    },
    sampleVariance: {
      type: 'Float!',
      description:
        'The sample variance is the sum of squared deviations from the mean.\n' +
        'The sample variance is distinguished from the variance by dividing the sum of squared deviations by (n - 1) ' +
        'instead of n. This corrects the bias in estimating a value from a sample set rather than the full population.',
    },
    standardDeviation: {
      type: 'Float!',
      description:
        'The standard deviation is the square root of the variance. This is also known as the population ' +
        'standard deviation. It is useful for measuring the amount of variation or dispersion in a set of values.',
    },
    sampleStandardDeviation: {
      type: 'Float!',
      description:
        'The standard deviation is the square root of the sample variance.',
    },
  },
});

export const PercentileDistributionDefaultPercentiles = [
  0.5, 0.75, 0.9, 0.95, 0.99, 0.995,
];

export const PercentileDistributionInput = schemaComposer.createInputTC({
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
      type: '[Float!]',
      defaultValue: PercentileDistributionDefaultPercentiles,
      description: 'The percentiles to get frequencies for',
    },
  },
});

export const PercentileDistributionTC = schemaComposer.createObjectTC({
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
    }).NonNull.List.NonNull,
  },
});
