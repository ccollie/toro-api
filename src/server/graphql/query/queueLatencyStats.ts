import {
  normalizeGranularity,
  getStatsClient,
  parseDateRange,
} from '../helpers';
import { FieldConfig } from '../types';
import { JobStatsQueryInputTC, JobStatsSnapshotTC } from '../types/stats';

export const queueLatencyStats: FieldConfig = {
  type: JobStatsSnapshotTC.NonNull.List.NonNull,
  description: 'Queries for job latency snapshots within a range',
  args: {
    input: JobStatsQueryInputTC.NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName, granularity, rangeStart, rangeEnd } = input;

    const client = getStatsClient(queueId);
    const _granularity = normalizeGranularity(granularity);
    const dates = parseDateRange(
      {
        start: rangeStart,
        end: rangeEnd,
      },
      _granularity,
    );
    return client.getLatency(jobName, _granularity, dates.start, dates.end);
  },
};
