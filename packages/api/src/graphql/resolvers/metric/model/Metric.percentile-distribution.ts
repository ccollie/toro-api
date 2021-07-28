import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import {
  OutlierFilterInputTC,
  PercentileDistributionDefaultPercentiles,
  PercentileDistributionTC,
} from '../../stats/types';
import { BaseMetric } from '@alpen/core';
import {
  MetricPercentileDistributionInput,
  PercentileDistribution,
} from '../../../typings';
import { getPercentileDistribution } from '@alpen/core';
import { getData } from './getData';

export const MetricPercentileDistributionInputTC = schemaComposer.createInputTC(
  {
    name: 'MetricPercentileDistributionInput',
    fields: {
      from: {
        type: 'Date!',
      },
      to: {
        type: 'Date!',
      },
      outlierFilter: OutlierFilterInputTC,
      percentiles: {
        type: '[Float!]',
        defaultValue: PercentileDistributionDefaultPercentiles,
        description: 'The percentiles to get frequencies for',
      },
    },
  },
);

export const metricPercentileDistributionFC: FieldConfig = {
  type: PercentileDistributionTC.NonNull,
  description: 'Compute a percentile distribution.',
  args: {
    input: MetricPercentileDistributionInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricPercentileDistributionInput },
    { loaders },
  ): Promise<PercentileDistribution> {
    const {
      from,
      to,
      outlierFilter,
      percentiles = PercentileDistributionDefaultPercentiles,
    } = input;

    const rawData = await getData(loaders, metric, from, to, outlierFilter);
    const values = rawData.map((x) => x.value);
    return getPercentileDistribution(values, percentiles);
  },
};
