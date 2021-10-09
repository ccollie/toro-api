import { EZContext } from 'graphql-ez';
import { FieldConfig, HostTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { QUEUE_DELETED_PREFIX } from '../../../helpers';

export const QueueDeleteOptions = schemaComposer.createInputTC({
  name: 'QueueDeleteOptions',
  fields: {
    checkExistence: {
      type: 'Boolean',
      defaultValue: true,
    },
    checkActivity: {
      type: 'Boolean',
      defaultValue: true,
    },
  },
});

export const queueDelete: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'QueueDeletePayload',
    fields: {
      queueId: {
        type: 'ID!',
        description: 'The id of the deleted queue',
      },
      queueName: {
        type: 'String!',
        description: 'The name of the deleted queue',
      },
      host: {
        type: HostTC.NonNull,
        description: 'The queue host',
      },
      deletedKeys: {
        type: 'Int!',
        description: 'The number of keys deleted',
      },
    },
  }).NonNull,
  args: {
    id: 'ID!',
    options: QueueDeleteOptions,
  },
  resolve: async (
    _,
    { id, options: { checkExistence, checkActivity } },
    { supervisor, publish, accessors }: EZContext,
  ) => {
    const host = accessors.getQueueHost(id);
    const queue = supervisor.getQueueById(id);
    const deletedKeys = await supervisor.deleteQueue(queue, {
      checkExists: checkExistence,
      checkActivity,
    });

    const queueId = id;
    const queueName = queue.name;
    const payload = {
      queueId,
      queueName,
      host,
      deletedKeys,
    };

    const eventName = `${QUEUE_DELETED_PREFIX}${host.id}`;
    publish(eventName, { queueId, queueName, hostId: host.id, deletedKeys });

    return payload;
  },
};
