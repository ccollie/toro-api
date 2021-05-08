import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { SerializedMetric } from '../../../../../types';
import { Rule } from '../../../../rules';
import { MetricTC } from '../../metrics';

export const ruleMetric: FieldConfig = {
  type: MetricTC,
  args: {},
  description: 'The metric being monitored',
  async resolve(parent: Rule): Promise<SerializedMetric | undefined> {
    const manager = getQueueManager(parent.queueId);
    const metric = await manager.metricManager.getMetric(parent.metricId);
    if (!metric) {
      return undefined;
    }
    return metric.toJSON();
  },
};
