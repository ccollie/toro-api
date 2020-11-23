import { normalizeGranularity, getStatsClient } from '../helpers';
import { FieldConfig } from '../types';
import { QueueStatsSpanInput, QueueStatsSpanPayload } from '../types/stats';

export const queueWaitTimeStatsSpan: FieldConfig = {
  type: QueueStatsSpanPayload,
  description: 'Gets the time range of recorded wait time stats for a queue',
  args: {
    input: QueueStatsSpanInput.NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, jobName, granularity } = input;

    const client = getStatsClient(queueId);
    const _granularity = normalizeGranularity(granularity);
    return client.getSpan(jobName, 'wait', _granularity);
  },
};
