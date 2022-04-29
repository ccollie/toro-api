import { Queue } from 'bullmq';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/query';
import { Metric } from '@alpen/core';

export const metrics: FieldConfig = {
  type: MetricTC.NonNull.List.NonNull,
  description: 'The metrics associated with the queue',
  args: {},
  async resolve(queue: Queue, _, { accessors }: EZContext): Promise<Metric[]> {
    const manager = accessors.getQueueManager(queue);
    return manager.metricsManager.metrics;
  },
};
