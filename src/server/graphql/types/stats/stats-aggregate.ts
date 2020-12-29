import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { StatsQueryInputTC, StatsSnapshotTC } from './types';
import { aggregateStats } from './utils';

export const statsAggregate: ObjectTypeComposerFieldConfigDefinition<
  any,
  any
> = {
  type: StatsSnapshotTC,
  description: 'Aggregates queue statistics within a range',
  args: {
    input: StatsQueryInputTC.NonNull,
  },
  async resolve(_, { input }) {
    const { jobName, metric, granularity, range } = input;
    return aggregateStats(_, jobName, range, metric, granularity);
  },
};
