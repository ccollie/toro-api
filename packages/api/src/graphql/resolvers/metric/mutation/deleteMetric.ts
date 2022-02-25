import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { QueueTC } from '../../queue/query';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteMetric: FieldConfig = {
  description: 'Delete a queue metric',
  type: schemaComposer.createObjectTC({
    name: 'DeleteMetricResult',
    fields: {
      queue: QueueTC.NonNull,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteMetricInput',
      fields: {
        queueId: 'ID!',
        metricId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { queueId, metricId } = input;
    const manager = accessors.getQueueManager(queueId, true);
    const result = await manager.metricManager.deleteMetric(metricId);

    if (!result) {
      throw boom.notFound(`No filter found with id "${metricId}"`);
    }

    return {
      queue: manager.queue,
      isDeleted: result,
    };
  },
};
