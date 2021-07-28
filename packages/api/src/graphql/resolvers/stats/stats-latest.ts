import { normalizeGranularity } from '../../helpers';
import { FieldConfig } from '../index';
import { HostManager } from '@alpen/core';
import { getClient } from './utils';
import { StatsGranularityEnum, StatsMetricsTypeEnum } from '../../scalars';
import { schemaComposer } from 'graphql-compose';
import {
  StatsMetricType,
  StatsGranularity,
  StatisticalSnapshot,
} from '@alpen/core';
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
    let snapshot: StatisticalSnapshot;
    const client = getClient(_);
    const unit = normalizeGranularity(granularity);
    if (_ instanceof HostManager) {
      snapshot = await client.getHostLast(
        jobName,
        metric as StatsMetricType,
        unit,
      );
    } else {
      snapshot = await client.getLast(jobName, metric as StatsMetricType, unit);
    }
    // HACK!!!
    if (snapshot) {
      snapshot.m1Rate = snapshot.m1Rate ?? 0;
      snapshot.m5Rate = snapshot.m5Rate ?? 0;
      snapshot.m15Rate = snapshot.m15Rate ?? 0;
    }
    return snapshot;
  },
};
