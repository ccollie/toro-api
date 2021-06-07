import { Queue } from 'bullmq';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metrics';
import { SerializedMetric } from '../../../../../types';

export const queueMetrics: FieldConfig = {
  type: MetricTC.NonNull.List.NonNull,
  args: {},
  async resolve(queue: Queue): Promise<SerializedMetric[]> {
    const manager = getQueueManager(queue);
    return manager.metricManager.metrics.map((x) => {
      const metric = x.toJSON();
      // somewhat hackish
      (metric as any).queueId = manager.id;
      return metric;
    });
  },
};
