import { normalizeGranularity, getStatsClient } from '../helpers';
import { FieldConfig } from '../types';
import { JobStatsQueryInputTC, JobStatsSnapshotTC } from '../types/stats';

export const queueWaitTimeStatsLatest: FieldConfig = {
  type: JobStatsSnapshotTC.NonNull,
  description: 'Gets the last recorded wait time stats snapshot',
  args: {
    input: JobStatsQueryInputTC.NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName, granularity } = input;
    const client = getStatsClient(queueId);
    const _granularity = normalizeGranularity(granularity);
    return client.getLast(jobName, 'wait', _granularity);
  },
};
