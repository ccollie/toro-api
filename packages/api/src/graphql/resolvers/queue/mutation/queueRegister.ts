import { Queue } from 'bullmq';
import boom from '@hapi/boom';
import { HostManager, QueueConfig } from '@alpen/core';
import { FieldConfig, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { QUEUE_REGISTERED_PREFIX, getHostById } from '../../../helpers';
import { RegisterQueueInput } from '../../../typings';

async function queueExists(
  host: HostManager,
  prefix: string,
  name: string,
): Promise<boolean> {
  const metaKey = `${prefix}:${name}:meta`;
  const client = host.client;
  const queueExists = await client.exists(metaKey);
  return !!queueExists;
}

async function ensureQueueExists(
  host: HostManager,
  prefix: string,
  name: string,
): Promise<void> {
  const exists = await queueExists(host, prefix, name);

  if (!exists) {
    throw boom.notFound(
      `Queue "${prefix}:${name}" not found in host ${host.name}`,
    );
  }
}

export const queueRegister: FieldConfig = {
  description: 'Start tracking a queue',
  type: QueueTC.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'RegisterQueueInput',
      fields: {
        hostId: 'ID!',
        prefix: {
          type: 'String',
          defaultValue: 'bull',
        },
        name: {
          type: 'String!',
          description: 'the queue names',
        },
        checkExists: {
          type: 'Boolean',
          defaultValue: true,
        },
        trackMetrics: {
          type: 'Boolean',
          defaultValue: false,
        },
      },
    }),
  },
  async resolve(
    _: unknown,
    { input }: { input: RegisterQueueInput },
    { publish },
  ): Promise<Queue> {
    const {
      hostId,
      prefix = 'bull',
      name,
      checkExists = false,
      trackMetrics = false,
    } = input;

    const host = getHostById(hostId);

    // see if we're managing it already
    const queue = host.getQueue(prefix, name);
    if (queue) {
      throw boom.badRequest(
        `Queue "${prefix}:${name}" already managed by host "${host.name}"`,
      );
    }

    if (checkExists) {
      await ensureQueueExists(host, prefix, name);
    }

    const config: QueueConfig = {
      prefix,
      name,
      trackMetrics,
    };

    const mgr = await host.addQueue(config);

    const queueManager = host.getQueueManager(mgr.queue);
    const eventName = `${QUEUE_REGISTERED_PREFIX}${host.id}`;
    publish(eventName, {
      hostId: host.id,
      queueId: queueManager.id,
      queueName: queue.name,
      prefix,
    });

    return mgr.queue;
  },
};
