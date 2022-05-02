import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { MetricGranularityEnum } from '../../metric/scalars';
import boom from '@hapi/boom';

export const deleteQueueMetrics: FieldConfig = {
  description: 'Delete all stats associated with a queue',
  type: schemaComposer.createObjectTC({
    name: 'DeleteQueueMetricsResult',
    fields: {
      isDeleted: 'Boolean!',
      queue: QueueTC.NonNull,
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteQueueMetricsInput',
      fields: {
        queueId: {
          type: 'ID!',
          description: "The queue to delete metrics from"
        },
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId } = input;
    const queue = accessors.getQueueManager(queueId, true);
    const manager = queue.metricsManager;

    // await manager.clearData();
    //  const count = await deleteStats(queue);
    // exposing key count makes no sense to an end user and leaks implementation
    // details
    // const isDeleted = count > 0;
    throw boom.notImplemented('deleteQueueMetrics');
  },
};
