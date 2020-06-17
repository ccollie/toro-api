'use strict';
import {
  DiscoveredQueue,
  HostManager,
  Supervisor,
  RedisMetrics,
} from '../../imports';
import { Queue } from 'bullmq';
import boom from '@hapi/boom';

export const hostResolver = {
  Query: {
    hosts(_, args, { supervisor }): HostManager[] {
      return (supervisor as Supervisor).hosts;
    },
    host(_, { id }, { supervisor }): HostManager {
      return supervisor.hosts.find((x) => x.id === id);
    },
    hostByName(_, { name }, { supervisor }): HostManager {
      return supervisor.getHost(name);
    },
    async discoverQueues(_, args, context): Promise<DiscoveredQueue[]> {
      const { supervisor } = context;
      const { hostId, prefix } = args;
      const host = supervisor.getHostById(hostId) || supervisor.getHost(hostId);
      if (!host) {
        throw boom.notFound(`Host with id "${hostId}"`);
      }
      return host.discoverQueues(prefix);
    },
  },
  QueueHost: {
    async redis(parent: HostManager): Promise<RedisMetrics> {
      return parent.getRedisInfo();
    },
    queues(host: HostManager): Queue[] {
      return host.getQueues();
    },
  },
};
