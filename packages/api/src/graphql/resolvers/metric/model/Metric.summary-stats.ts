import boom from '@hapi/boom';
import { FieldConfig } from '../../utils';
import { SummaryStatisticsTC } from '../../stats/types';
import { BaseMetric } from '@alpen/core';
import { MetricDataInput, SummaryStatistics } from '../../../typings';
import { getMetricData } from '../../../loaders/metric-data';
import { MetricDataInputTC } from './Metric.data';
import { calcSummaryStats } from '../../stats/summary';

export const metricSummaryStatsFC: FieldConfig = {
  type: SummaryStatisticsTC.NonNull,
  description:
    'Returns simple descriptive statistics from a range of metric data',
  args: {
    input: MetricDataInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricDataInput },
    { loaders },
  ): Promise<SummaryStatistics> {
    const { start, end } = input;
    let _start, _end;
    if (start && end) {
      _start = start;
      _end = end;
    } else {
      throw boom.badRequest('Start and end must be specified');
    }

    const data = await getMetricData(loaders, metric, _start, _end);
    return calcSummaryStats(data.map((x) => x.value));
  },
};
