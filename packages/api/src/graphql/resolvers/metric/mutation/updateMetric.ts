import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../query';
import { MetricInputTC } from '../scalars';

export const updateMetric: FieldConfig = {
  description: 'Update a job metric',
  type: MetricTC.NonNull,
  args: {
    input: MetricInputTC.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, id, name, description, aggregator } =
      input;
    const queueManager = accessors.getQueueManager(queueId, true);
    const manager = queueManager.metricsManager;
    const metric = await manager.getMetric(id);

    if (!metric) {
      throw boom.notFound(
        `No metric with id#${id} found for queue "${queueManager.name}"`,
      );
    }

    await manager.saveMetric(metric);
    return metric;
  },
};
