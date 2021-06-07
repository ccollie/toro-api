'use strict';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../index';
import { MetricCreateTC } from '../index';
import { SerializedMetric } from '@src/types';
import { MetricTC } from '../model';

export const metricCreate: FieldConfig = {
  description: 'Create a queue metric',
  type: MetricTC.NonNull,
  args: {
    input: MetricCreateTC.NonNull,
  },
  resolve: async (_, { input }) => {
    const { queueId, ...rest } = input;
    const manager = getQueueManager(queueId);
    const data = rest as SerializedMetric;
    const metric = await manager.metricManager.createMetric(data);
    const result = metric.toJSON();
    (result as any).queueId = queueId;
    return result;
  },
};
