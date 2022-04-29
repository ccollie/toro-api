import { MetricGranularity } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { MetricGranularityEnum, TimeSpanTC } from '../../scalars';
import { FieldConfig } from '../index';
import { getMetricManager, normalizeGranularity } from '../stats/utils';
import { MetricTypeTC } from '../metric/scalars';

const StatsSpanInput = schemaComposer.createInputTC({
  name: 'StatsSpanInput',
  fields: {
    id: {
      type: 'ID!',
      description: 'The host/queue to query',
    },
    jobName: 'String',
    metric: MetricTypeTC.NonNull,
    granularity: MetricGranularityEnum,
  },
});

export const statsDateRange: FieldConfig = {
  type: TimeSpanTC,
  description: 'Gets the time range of recorded stats for a queue/host',
  args: {
    input: StatsSpanInput.NonNull,
  },
  async resolve(_, { input }, context) {
    const { granularity = MetricGranularity.Minute } = input;
    const _granularity = normalizeGranularity(granularity);
    const manager = getMetricManager(context, _);
    const v = await manager.getMetricDateRange(_, _granularity);
    return v;
  },
};
