import { schemaComposer } from 'graphql-compose';
import { MetricGranularityEnum, PeakSignalDirectionEnum } from '../../scalars';
import { OutlierMethod } from '@alpen/core';
import { MetricTypeTC } from '../metric/scalars';

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
  description: 'Stats snapshot.',
  fields: {
    count: {
      type: 'Int!',
      description: 'The number of samples',
    },
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
  description: 'Queue metrics filter.',
  fields: {
    metric: {
      type: MetricTypeTC.NonNull,
      makeRequired: true,
      description: 'The metric requested',
    },
    granularity: {
      type: MetricGranularityEnum,
      description: 'Snapshot granularity',
    },
    start: {
      type: 'Date!',
    },
    end: {
      type: 'Date!',
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
      type: 'String!', // TODO
      makeRequired: true,
      defaultValue: 'latency',
      description: 'The metric requested',
    },
    granularity: {
      type: MetricGranularityEnum,
      description: 'Metric granularity',
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

export const OutlierDetectionMethod = schemaComposer.createEnumTC({
  name: 'OutlierDetectionMethod',
  description: 'Method used for outlier detection',
  values: {
    [OutlierMethod.Sigma]: {
      value: OutlierMethod.Sigma,
      description: 'Detect outliers based on deviations from the mean.',
    },
    [OutlierMethod.IQR]: {
      value: OutlierMethod.IQR,
      description: 'Detect outliers based on the Inter Quartile Range.',
    },
    [OutlierMethod.MAD]: {
      value: OutlierMethod.MAD,
      description:
        'Detect outliers based on Iglewicz and Hoaglin (Mean Absolute Deviation).',
    },
  },
});

export const OutlierFilterInputTC = schemaComposer.createInputTC({
  name: 'OutlierFilterInput',
  description: 'Input parameters for outlier filtering',
  fields: {
    method: OutlierDetectionMethod.NonNull,
    threshold: {
      type: 'Float',
      description: 'Optional detection threshold',
    },
  },
});
