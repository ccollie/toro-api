import { ObjectTypeComposerFieldConfigDefinition } from 'graphql-compose';
import { StatsQueryInputTC, StatsSnapshotTC } from './types';
import { Queue } from 'bullmq';
import { getStats } from './utils';

export const stats: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: StatsSnapshotTC.NonNull.List.NonNull,
  description: 'Queries for queue stats snapshots within a range',
  args: {
    input: StatsQueryInputTC.NonNull,
  },
  async resolve(queue: Queue, { input }) {
    const { jobName, metric, granularity, range } = input;

    return getStats(queue, jobName, range, metric, granularity);
  },
};
