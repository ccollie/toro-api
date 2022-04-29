import { MetricGranularity } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { MetricNameScalar, MetricGranularityEnum } from '../../scalars';
import { FieldConfig } from '../index';
import { StatsSnapshotTC } from './types';
import { getMetricManager, normalizeGranularity } from './utils';
import boom from '@hapi/boom';

export const StatsLatestInputTC = schemaComposer.createInputTC({
  name: 'StatsLatestInput',
  description: 'Queue stats filter to getting latest snapshot.',
  fields: {
    metric: {
      type: MetricNameScalar,
      makeRequired: true,
      description: 'The metric requested',
    },
    granularity: {
      type: MetricGranularityEnum,
      makeRequired: true,
      defaultValue: MetricGranularity.Minute, // TODO: should be hour, i think
      description: 'Stats snapshot granularity',
    },
  },
});

export const statsLatest: FieldConfig = {
  type: StatsSnapshotTC,
  description: 'Gets the last recorded queue stats snapshot for a metric',
  args: {
    input: StatsLatestInputTC,
  },
  async resolve(_, { input }, context) {
    const { granularity, metric } = input;
    const manager = getMetricManager(context, _);
    const unit = normalizeGranularity(granularity);
    throw boom.notImplemented('getLatest');
  },
};
