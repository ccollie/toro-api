import { FieldConfig } from '../../utils';
import { BaseMetric } from '@server/metrics';
import { Timespan } from '@src/types';
import { TimeSpanTC } from '@server/graphql/resolvers/scalars';
import { getMetricDateRange } from '@server/graphql/loaders/metric-date-range';

export const metricDateRangeFC: FieldConfig = {
  type: TimeSpanTC,
  description:
    'Returns the timestamps of the first and last data items recorded for the metric',
  args: {},
  async resolve(metric: BaseMetric, _, { loaders }): Promise<Timespan> {
    return getMetricDateRange(loaders, metric);
  },
};
