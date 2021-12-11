import { BaseMetric, Timespan } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { TimeSpanTC } from '../../../scalars';
import { FieldConfig } from '../../utils';

export const metricDateRangeFC: FieldConfig = {
  type: TimeSpanTC,
  description:
    'Returns the timestamps of the first and last data items recorded for the metric',
  args: {},
  async resolve(
    metric: BaseMetric,
    _,
    { loaders }: EZContext,
  ): Promise<Timespan> {
    return loaders.metricDateRange.load(metric);
  },
};
