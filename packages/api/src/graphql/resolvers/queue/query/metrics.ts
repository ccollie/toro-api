import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/query';
import { BaseMetric } from '@alpen/core';

export const metrics: FieldConfig = {
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
