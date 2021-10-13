import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { BaseMetric } from '@alpen/core/metrics';
import { Timespan } from '@alpen/core/types';
import { TimeSpanTC } from '../../../scalars';

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
