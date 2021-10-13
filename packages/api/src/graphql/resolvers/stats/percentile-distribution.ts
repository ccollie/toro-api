import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { getSnapshotPercentileDistribution } from '@alpen/core/stats';
import { aggregateStats } from './utils';
import {
  PercentileDistributionDefaultPercentiles,
  PercentileDistributionInput,
  PercentileDistributionTC,
} from './types';

export const percentileDistribution: FieldConfig = {
  type: PercentileDistributionTC.NonNull,
  description: 'Compute a percentile distribution.',
  args: {
    input: PercentileDistributionInput.NonNull,
  },
  async resolve(_, { input }, context: EZContext) {
    const {
      jobName,
      metric,
      granularity,
      range,
      percentiles = PercentileDistributionDefaultPercentiles,
    } = input;

    const snapshot = await aggregateStats(
      context,
      _,
      jobName,
      range,
      metric,
      granularity,
    );

    return getSnapshotPercentileDistribution(snapshot, percentiles);
  },
};
