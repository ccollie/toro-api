import { EZContext } from 'graphql-ez';
import { FieldConfig, HostTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { QUEUE_DELETED_PREFIX } from '../../../helpers';

export const DeleteQueueOptions = schemaComposer.createInputTC({
  name: 'DeleteQueueOptions',
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

export const deleteQueue: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'DeleteQueueDeleteResult',
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
    },
  }).NonNull,
  args: {
    id: 'ID!',
    options: DeleteQueueOptions,
  },
  resolve: async (
    _,
    { id, options: { checkExistence, checkActivity } },
    { supervisor, publish, accessors }: EZContext,
  ) => {
    const host = accessors.getQueueHost(id);
    const queue = accessors.getQueueById(id, true);
    await supervisor.deleteQueue(queue, {
      checkExists: checkExistence,
      checkActivity,
    });

    const queueId = id;
    const queueName = queue.name;
    const payload = {
      queueId,
      queueName,
      host,
    };

    const eventName = `${QUEUE_DELETED_PREFIX}${host.id}`;
    publish(eventName, { queueId, queueName, hostId: host.id });

    return payload;
  },
};
