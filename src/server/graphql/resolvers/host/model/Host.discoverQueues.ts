import {
  ObjectTypeComposerFieldConfigDefinition,
  schemaComposer,
} from 'graphql-compose';
import boom from '@hapi/boom';
import { HostManager } from '@server/hosts';
import { DiscoveredQueue } from '@src/types';

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

export const discoverQueues: ObjectTypeComposerFieldConfigDefinition<any, any> =
  {
    type: DiscoverQueuesPayloadTC.NonNull.List.NonNull,
    description: 'Discover Bull queues on the given host',
    args: {
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
    async resolve(host: HostManager, args): Promise<DiscoveredQueue[]> {
      const { hostId, prefix, unregisteredOnly = true } = args;
      if (!host) {
        throw boom.notFound(`Host with id "${hostId}"`);
      }
      return host.discoverQueues(prefix, unregisteredOnly);
    },
  };
