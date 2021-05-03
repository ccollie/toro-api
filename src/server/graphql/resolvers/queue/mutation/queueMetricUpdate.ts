'use strict';
import boom from '@hapi/boom';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../index';
import { MetricTC, MetricInputTC } from '../../metrics';
import { MetricOptions } from '../../../../../types';
import { createAggregator } from '../../../../metrics';

export const queueMetricUpdate: FieldConfig = {
  description: 'Update a job metric',
  type: MetricTC.NonNull,
  args: {
    input: MetricInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const {
      queueId,
      metricId,
      name,
      description,
      isActive,
      options,
      aggregator,
    } = input;
    const manager = getQueueManager(queueId);
    const metric = await manager.metricManager.getMetric(metricId);

    if (!metric) {
      throw boom.notFound(
        `No metric with id#${metricId} found for queue "${manager.name}"`,
      );
    }

    if (name !== undefined) {
      if (name.length === 0) {
        throw boom.badRequest('metric.name must have a value');
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
      metric.setOptions(options as MetricOptions);
    }

    // TODO: should we remove present data
    if (aggregator !== undefined) {
      const agg = createAggregator(
        aggregator.type,
        metric.clock,
        aggregator.options,
      );
      metric.aggregator = agg;
    }

    await manager.metricManager.saveMetric(metric);
    return metric;
  },
};
