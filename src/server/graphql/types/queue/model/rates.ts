import { getStatsListener } from '../../../helpers';
import { FieldConfig } from '../../index';
import { QueueStats } from '../../../../stats';
import { MeterTC } from '../../stats/MeterTC';
import boom from '@hapi/boom';
import { Queue } from 'bullmq';

export function getRatesResolver(type: 'completed' | 'error'): FieldConfig {
  return {
    type: MeterTC.NonNull,
    description: `Gets the current job ${type} rates based on an exponential moving average`,
    args: {
      jobName: 'String',
    },
    async resolve(queue: Queue, { jobName }) {
      const listener = getStatsListener(queue);
      const stats: QueueStats = jobName
        ? listener.getJobNameStats(jobName)
        : listener.queueStats;
      if (!stats) {
        let msg = 'No stats found';
        if (jobName) {
          msg = `No stats found for job name "${jobName}"`;
        }
        throw boom.notFound(msg);
      }
      if (type === 'error') {
        return stats.errors.getSummary();
      }
      return stats.getThroughputRateSummary();
    },
  };
}
