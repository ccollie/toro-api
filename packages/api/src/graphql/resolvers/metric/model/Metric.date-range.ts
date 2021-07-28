import { FieldConfig } from '../../utils';
import { BaseMetric, Timespan } from '@alpen/core';
import { TimeSpanTC } from '../../../scalars';
import { getMetricDateRange } from '../../../loaders/metric-date-range';

export const metricDateRangeFC: FieldConfig = {
  type: TimeSpanTC,
  description:
    'Returns the timestamps of the first and last data items recorded for the metric',
  args: {},
  async resolve(metric: BaseMetric, _, { loaders }): Promise<Timespan> {
    return getMetricDateRange(loaders, metric);
  },
};
