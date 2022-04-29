import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { StatsSnapshotTC } from '../../stats/types';
import { Metric, StatsSnapshot } from '@alpen/core';
import { MetricDataInputTC } from '../../metric/query/data';
import { getMetricManagerFromMetric, normalizeGranularity } from '../../stats';

export const stats: FieldConfig = {
  type: StatsSnapshotTC.NonNull,
  description: 'Calculates summary stats over metric data in a given range',
  args: {
    input: MetricDataInputTC.NonNull,
  },
  async resolve(
    metric: Metric,
    { input },
    context: EZContext,
  ): Promise<StatsSnapshot> {
    const { start, end, aggregator, granularity } = input;
    const manager = getMetricManagerFromMetric(context, metric);
    const unit = normalizeGranularity(granularity);
    return manager.getStats(metric, unit, start, end, aggregator);
  },
};
