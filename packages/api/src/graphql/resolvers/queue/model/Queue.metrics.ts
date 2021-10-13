import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/model';
import { BaseMetric } from '@alpen/core/metrics';

export const queueMetrics: FieldConfig = {
  type: MetricTC.NonNull.List.NonNull,
  args: {},
  async resolve(
    queue: Queue,
    _,
    { accessors }: EZContext,
  ): Promise<BaseMetric[]> {
    const manager = accessors.getQueueManager(queue);
    return manager.metricManager.metrics;
  },
};
