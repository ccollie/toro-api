import { schemaComposer } from 'graphql-compose';
import { QueueTC } from '../../queue/model/Queue';
import { Queue } from 'bullmq';
import { HostManager } from '../../../../hosts';
import { hostRedisFC } from './Host.redis';
import { hostChannelsFC } from './Host.channels';

export const HostTC = schemaComposer.createObjectTC({
  name: 'QueueHost',
  fields: {
    id: 'ID!',
    name: {
      type: 'String!',
      description: 'The name of the host',
    },
    description: {
      type: 'String',
      description: 'An optional description of the host',
    },
    queues: {
      type: QueueTC.List.NonNull,
      description: 'The queues registered for this host',
      resolve: (host: HostManager): Queue[] => {
        return host.getQueues();
      },
    },
    channels: hostChannelsFC,
    redis: hostRedisFC,
  },
});
