import { getQueueManager } from '../../../helpers';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const metricDelete: FieldConfig = {
  description: 'Delete a queue metric',
  type: schemaComposer.createObjectTC({
    name: 'MetricDeletePayload',
    fields: {
      queue: QueueTC.NonNull,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'MetricDeleteInput',
      fields: {
        queueId: 'ID!',
        metricId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }) {
    const { queueId, metricId } = input;
    const manager = getQueueManager(queueId);
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
