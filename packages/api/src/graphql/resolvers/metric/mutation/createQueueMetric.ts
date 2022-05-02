import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../query';
import { schemaComposer } from 'graphql-compose';
import { SupportedMetric } from '../scalars';

const CreateQueueMetricInputTC = schemaComposer
  .createInputTC({
    name: 'CreateQueueMetricInput',
    description: 'Input fields for creating a metric',
    fields: {
      queueId: {
        type: 'ID!',
        description: 'The queue to add the metric to',
      },
      name: {
        type: SupportedMetric.NonNull,
        description: 'The metric to collect',
      },
    },
  });

export const createQueueMetric: FieldConfig = {
  description: 'Create a queue metric',
  type: MetricTC.NonNull,
  args: {
    input: CreateQueueMetricInputTC.NonNull,
  },
  resolve: async (_, { input }, context: EZContext) => {
    const { queueId, name } = input;
    const queueManager = context.accessors.getQueueManager(queueId, true);
    const manager = queueManager.metricsManager;
    // TODO !!!!!
    const metric = await manager.createMetric(name);
    return metric;
  },
};
