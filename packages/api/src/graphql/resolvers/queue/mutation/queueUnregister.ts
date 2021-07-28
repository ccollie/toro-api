import boom from '@hapi/boom';
import { FieldConfig, HostTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { Supervisor } from '@alpen/core';
import { getQueueManager, QUEUE_UNREGISTERED_PREFIX } from '../../../helpers';

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
  async resolve(_: unknown, { id }, { supervisor, publish }) {
    const manager = getQueueManager(id);
    if (!manager) {
      throw boom.notFound(`No queue found with id#${id}`);
    }
    const queue = manager.queue;
    const isRemoved = await (supervisor as Supervisor).removeQueue(queue);
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
