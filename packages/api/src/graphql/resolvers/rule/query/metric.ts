import { BaseMetric, Rule } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { MetricTC } from '../../metric/query';
import { FieldConfig } from '../../utils';

export const metric: FieldConfig = {
  type: MetricTC,
  args: {},
  description: 'The metric being monitored',
  async resolve(
    parent: Rule,
    _: unknown,
    { accessors }: EZContext,
  ): Promise<BaseMetric> {
    const manager = accessors.getQueueManager(parent.queueId);
    return manager.metricManager.getMetric(parent.metricId);
  },
};
