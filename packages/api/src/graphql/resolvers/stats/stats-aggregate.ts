import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { StatsQueryInputTC, StatsSnapshotTC } from './types';
import { aggregateStats } from './utils';

export const statsAggregate: ObjectTypeComposerFieldConfigDefinition<any, any> =
  {
    type: StatsSnapshotTC,
    description: 'Aggregates queue statistics within a range',
    args: {
      input: StatsQueryInputTC.NonNull,
    },
    async resolve(_, { input }, context) {
      const { jobName, metric, granularity, range } = input;
      return await aggregateStats(
        context,
        _,
        jobName,
        range,
        metric,
        granularity,
      );
    },
  };
