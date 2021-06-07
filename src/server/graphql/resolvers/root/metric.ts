import { FieldConfig } from '../index';
import { getQueueManager } from '../../helpers';
import { MetricTC } from '../metric/model';
import { SerializedMetric } from '@src/types';
import boom from '@hapi/boom';

export const metric: FieldConfig = {
  type: MetricTC,
  description: 'Get a queue Metric by id',
  args: {
    queueId: 'ID!',
    metricId: 'ID!',
  },
  async resolve(_, { queueId, metricId }): Promise<SerializedMetric> {
    const manager = getQueueManager(queueId);
    const metric = await manager.metricManager.getMetric(metricId);
    if (!metric) {
      throw boom.notFound(`Cannot find a metric with the id "${metric.id}"`);
    }
    const result = metric.toJSON();
    (result as any).queueId = queueId;
    return result;
  },
};
