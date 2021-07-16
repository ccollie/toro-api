'use strict';
import boom from '@hapi/boom';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../index';
import { MetricInputTC } from '../index';
import { QueueMetricOptions } from '@src/types';
import { createAggregator } from '@server/metrics';
import { MetricTC } from '../model';

export const metricUpdate: FieldConfig = {
  description: 'Update a job metric',
  type: MetricTC.NonNull,
  args: {
    input: MetricInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, id, name, description, isActive, options, aggregator } =
      input;
    const manager = getQueueManager(queueId);
    const metric = await manager.metricManager.getMetric(id);

    if (!metric) {
      throw boom.notFound(
        `No metric with id#${id} found for queue "${manager.name}"`,
      );
    }

    if (name !== undefined) {
      if (name.length === 0) {
        throw boom.badRequest('metric.name must have a value');
      }

      const foundByName = manager.metricManager.getMetricByName(metric.name);
      if (foundByName && foundByName.id !== metric.id) {
        throw boom.badRequest('A metric must have a unique name');
      }
      metric.name = name;
    }

    if (description !== undefined) {
      metric.description = description;
    }

    if (isActive !== undefined) {
      metric.isActive = isActive;
    }

    if (options !== undefined) {
      metric.setOptions(options as QueueMetricOptions);
    }

    // TODO: should we remove present data
    if (aggregator !== undefined) {
      metric.aggregator = createAggregator(aggregator.type, aggregator.options);
    }

    await manager.metricManager.saveMetric(metric);
    return metric;
  },
};
