import { createAggregator  } from '@alpen/core';
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
    const manager = accessors.getQueueManager(queueId, true);
    const metric = await manager.metricManager.getMetric(id);

    if (!metric) {
      throw boom.notFound(
        `No metric with id#${id} found for queue "${manager.name}"`,
      );
    }

    await manager.metricManager.saveMetric(metric);
    return metric;
  },
};
