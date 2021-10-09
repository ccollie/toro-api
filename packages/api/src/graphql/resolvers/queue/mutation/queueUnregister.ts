import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import { FieldConfig, HostTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { QUEUE_UNREGISTERED_PREFIX } from '../../../helpers';

export const queueUnregister: FieldConfig = {
  description: 'Stop tracking a queue',
  type: schemaComposer.createObjectTC({
    name: 'QueueUnregisterPayload',
    fields: {
      host: HostTC.NonNull,
      queue: QueueTC.NonNull,
      isRemoved: 'Boolean!',
    },
  }).NonNull,
  args: {
    id: 'ID!',
  },
  async resolve(
    _: unknown,
    { id },
    { supervisor, publish, accessors }: EZContext,
  ) {
    const manager = accessors.getQueueManager(id);
    if (!manager) {
      throw boom.notFound(`No queue found with id#${id}`);
    }
    const queue = manager.queue;
    const isRemoved = await supervisor.removeQueue(queue);
    const host = manager.hostManager;
    const prefix = manager.prefix;

    const eventName = `${QUEUE_UNREGISTERED_PREFIX}${host.id}`;
    publish(eventName, {
      hostId: host.id,
      queueId: id,
      queueName: queue.name,
      prefix,
    });

    return {
      host,
      queue,
      isRemoved,
    };
  },
};
