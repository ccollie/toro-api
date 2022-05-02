import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteQueueMetricData: FieldConfig = {
  description: 'Delete all the stored data for a queue-based metric',
  type: schemaComposer.createObjectTC({
    name: 'DeleteQueueMetricDataResult',
    fields: {
      count:  {
        type: 'Int!',
        description: 'The number of records deleted'
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteQueueMetricDataInput',
      fields: {
        queueId: 'String!',
        metricId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, metricId } = input;
    const queue = accessors.getQueueManager(queueId, true);
    const manager = queue.metricsManager;
    const result = await manager.clearData(metricId);
    return {
      count: result
    };
  },
};
