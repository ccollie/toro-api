import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { Rule } from '@server/rules';
import { MetricTC } from '../../metric/model';
import { BaseMetric } from '@server/metrics';

export const ruleMetric: FieldConfig = {
  type: MetricTC,
  args: {},
  description: 'The metric being monitored',
  async resolve(parent: Rule): Promise<BaseMetric> {
    const manager = getQueueManager(parent.queueId);
    return manager.metricManager.getMetric(parent.metricId);
  },
};
