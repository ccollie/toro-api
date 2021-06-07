import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { SerializedMetric } from '@src/types';
import { Rule } from '@server/rules';
import { MetricTC } from '../../metric/model';

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
    // hack. Need a better way
    const data = metric.toJSON();
    data['queueId'] = parent.queueId;

    return data;
  },
};
