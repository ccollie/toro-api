import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../index';
import { MetricTC } from '../metric/model';
import boom from '@hapi/boom';

export const metric: FieldConfig = {
  type: MetricTC,
  description: 'Get a queue Metric by id',
  args: {
    queueId: 'ID!',
    metricId: 'ID!',
  },
  async resolve(_, { queueId, metricId }, { accessors }: EZContext) {
    const manager = accessors.getQueueManager(queueId);
    const metric = await manager.metricManager.getMetric(metricId);
    if (!metric) {
      throw boom.notFound(`Cannot find a metric with the id "${metric.id}"`);
    }
    return metric;
  },
};
