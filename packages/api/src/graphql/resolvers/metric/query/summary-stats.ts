import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { SummaryStatisticsTC } from '../../stats/types';
import { Metric } from '@alpen/core';
import { MetricDataInput, SummaryStatistics } from '../../../typings';
import { MetricDataInputTC } from '../../metric/query/data';
import { calcSummaryStats } from '../../stats/summary';
import { getMetricData } from './getData';

export const metricSummaryStatsFC: FieldConfig = {
  type: SummaryStatisticsTC.NonNull,
  description:
    'Returns simple descriptive statistics from a range of metric data',
  args: {
    input: MetricDataInputTC.NonNull,
  },
  async resolve(
    metric: Metric,
    { input }: { input: MetricDataInput },
    context: EZContext,
  ): Promise<SummaryStatistics> {
    const { start, end, outlierFilter } = input;

    const data = await getMetricData(context, metric, {
      from: start,
      to: end,
      outlierFilter,
    });
    return calcSummaryStats(data.map((x) => x.value));
  },
};
