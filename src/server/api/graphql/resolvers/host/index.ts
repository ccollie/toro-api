'use strict';
import {
  DiscoveredQueue,
  HostManager,
  Supervisor,
  RedisMetrics,
} from '../../imports';
import { Queue } from 'bullmq';

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
  },
  QueueHost: {
    async redis(parent: HostManager): Promise<RedisMetrics> {
      return parent.getRedisInfo();
    },
    queues(host: HostManager): Queue[] {
      return host.getQueues();
    },
    async discoverQueues(
      host: HostManager,
      { prefix },
    ): Promise<DiscoveredQueue[]> {
      return host.discoverQueues(prefix);
    },
  },
};
