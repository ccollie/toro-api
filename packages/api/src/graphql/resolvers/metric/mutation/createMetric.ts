'use strict';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { CreateMetricTC } from '../scalars';
import { SerializedMetric } from '@alpen/core';
import { MetricTC } from '../query';

export const createMetric: FieldConfig = {
  description: 'Create a queue metric',
  type: MetricTC.NonNull,
  args: {
    input: CreateMetricTC.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { queueId, ...rest } = input;
    const manager = accessors.getQueueManager(queueId, true);
    const data = rest as SerializedMetric;
    const metric = await manager.metricManager.createMetric(data);
    const result = metric.toJSON();
    (result as any).queueId = queueId;
    return result;
  },
};
