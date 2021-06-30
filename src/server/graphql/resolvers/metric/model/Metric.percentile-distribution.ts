import boom from '@hapi/boom';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import {
  PercentileDistributionDefaultPercentiles,
  PercentileDistributionTC,
} from '../../stats/types';
import { BaseMetric } from '@server/metrics';
import { PercentileDistribution } from '../../../typings';
import { getMetricData } from '@server/graphql/loaders/metric-data';
import { getPercentileDistribution } from '@server/stats';

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
    { input },
    { loaders },
  ): Promise<PercentileDistribution> {
    const {
      from,
      to,
      percentiles = PercentileDistributionDefaultPercentiles,
    } = input;
    let start, end;
    if (from && to) {
      start = from;
      end = to;
    } else {
      throw boom.badRequest('"from" and "to" must be specified');
    }

    const rawData = await getMetricData(loaders, metric, start, end);
    const values = rawData.map((x) => x.value);
    return getPercentileDistribution(values, percentiles);
  },
};
