import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/model';
import { Rule, BaseMetric } from '@alpen/core';

export const ruleMetric: FieldConfig = {
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
