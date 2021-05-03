'use strict';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../index';
import { MetricInputTC, MetricTC } from '../../metrics';
import { SerializedMetric } from '../../../imports';

export const queueMetricCreate: FieldConfig = {
  description: 'Add a queue metric',
  type: MetricTC.NonNull,
  args: {
    input: MetricInputTC.NonNull,
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
