import { Queue } from 'bullmq';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/model';
import { BaseMetric } from '@alpen/core';

export const queueMetrics: FieldConfig = {
  type: MetricTC.NonNull.List.NonNull,
  args: {},
  async resolve(queue: Queue): Promise<BaseMetric[]> {
    const manager = getQueueManager(queue);
    return manager.metricManager.metrics;
  },
};
