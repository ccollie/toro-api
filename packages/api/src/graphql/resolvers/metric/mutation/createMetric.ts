'use strict';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { CreateMetricInputTC } from '../scalars';
import { MetricTC } from '../query';
import { getMetricManager } from '../../stats';

export const createMetric: FieldConfig = {
  description: 'Create a queue metric',
  type: MetricTC.NonNull,
  args: {
    input: CreateMetricInputTC.NonNull,
  },
  resolve: async (_, { input }, context: EZContext) => {
    const { queueId, ...rest } = input;
    const manager = getMetricManager(context, _);
    // TODO !!!!!
    const metric = await manager.createMetric('jobs_waiting');
    return metric;
  },
};
