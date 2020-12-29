import { normalizeGranularity } from '../../helpers';
import { FieldConfig } from '../../types';
import { HostManager } from '../../../hosts';
import { getClient } from './utils';
import {
  StatsGranularityEnum,
  StatsMetricsTypeEnum,
} from '../../types/scalars';
import { schemaComposer } from 'graphql-compose';
import { StatsMetricType, StatsGranularity } from '../../../../types';
import { StatsSnapshotTC } from './types';

export const StatsLatestInputTC = schemaComposer.createInputTC({
  name: 'StatsLatestInput',
  description: 'Queue stats filter to getting latest snapshot.',
  fields: {
    jobName: {
      type: 'String',
      description: 'An optional job name to filter on',
    },
    metric: {
      type: StatsMetricsTypeEnum,
      makeRequired: true,
      defaultValue: 'latency',
      description: 'The metric requested',
    },
    granularity: {
      type: StatsGranularityEnum,
      makeRequired: true,
      defaultValue: StatsGranularity.Minute, // TODO: should be hour, i think
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
  async resolve(_, { input }) {
    const { jobName, granularity, metric } = input || {
      granularity: StatsGranularity.Minute,
      metric: 'latency',
    };
    const client = getClient(_);
    const unit = normalizeGranularity(granularity);
    if (_ instanceof HostManager) {
      return client.getHostLast(jobName, metric as StatsMetricType, unit);
    }
    return client.getLast(jobName, metric as StatsMetricType, unit);
  },
};
