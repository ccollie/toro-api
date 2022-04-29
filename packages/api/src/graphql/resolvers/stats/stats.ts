import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { StatsQueryInputTC, StatsSnapshotTC } from './types';
import { Queue } from 'bullmq';
import boom from '@hapi/boom';

export const stats: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: StatsSnapshotTC.NonNull.List.NonNull,
  description: 'Queries for metric snapshots within a range',
  args: {
    input: StatsQueryInputTC.NonNull,
  },
  async resolve(queue: Queue, { input }, context) {
    const { metric, granularity, start, end } = input;
    throw boom.notImplemented('stats');
  },
};
