import { Metric, getPercentileDistribution } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { MetricPercentileDistributionInput, PercentileDistribution, } from '../../../typings';
import {
  OutlierFilterInputTC,
  PercentileDistributionDefaultPercentiles,
  PercentileDistributionTC,
} from '../../stats/types';
import { FieldConfig } from '../../utils';
import { getMetricData } from './getData';

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
    metric: Metric,
    { input }: { input: MetricPercentileDistributionInput },
    context: EZContext,
  ): Promise<PercentileDistribution> {
    const {
      from,
      to,
      outlierFilter,
      percentiles = PercentileDistributionDefaultPercentiles,
    } = input;

    const rawData = await getMetricData(context, metric, {
      from,
      to,
      outlierFilter,
    });
    const values = rawData.map((x) => x.value);
    return getPercentileDistribution(values, percentiles);
  },
};
