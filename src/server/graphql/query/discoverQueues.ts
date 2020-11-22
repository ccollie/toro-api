import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../types';
import { DiscoveredQueue } from '../../../types';
import boom from '@hapi/boom';

const DiscoverQueuesPayloadTC = schemaComposer.createObjectTC({
  name: 'DiscoverQueuesPayload',
  fields: {
    name: {
      type: 'String!',
      description: 'The queue name',
    },
    prefix: {
      type: 'String!',
      description: 'The queue prefix',
    },
  },
});

export const discoverQueues: FieldConfig = {
  type: DiscoverQueuesPayloadTC.NonNull.List.NonNull,
  description: 'Discover Bull queues on the given host',
  args: {
    hostId: {
      type: 'ID!',
      description: 'Host Id',
    },
    prefix: {
      type: 'String',
      description: 'Optional prefix filter',
      defaultValue: 'bull*',
    },
    unregisteredOnly: {
      type: 'Boolean',
      defaultValue: true,
      description:
        'Return only queues that are not registered. If false ' +
        'it returns all queues in the host instance, whether ' +
        'they are tracked or not',
    },
  },
  async resolve(
    _: unknown,
    args,
    context: unknown,
  ): Promise<DiscoveredQueue[]> {
    const { supervisor } = context as any;
    const { hostId, prefix, unregisteredOnly = true } = args;
    const host = supervisor.getHostById(hostId) || supervisor.getHost(hostId);
    if (!host) {
      throw boom.notFound(`Host with id "${hostId}"`);
    }
    return host.discoverQueues(prefix, unregisteredOnly);
  },
};
