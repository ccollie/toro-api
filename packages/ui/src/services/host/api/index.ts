import {
  DiscoverQueuesDocument,
  GetHostChannelsDocument,
  GetHostQueuesDocument,
  GetHostsAndQueuesDocument,
  GetRedisStatsDocument,
  RegisterQueueDocument,
} from '@/types';
import type {
  DiscoverQueuesPayload,
  NotificationChannel,
  Queue,
  QueueHost,
  RegisterQueueMutation,
  RedisStatsFragment,
} from '@/types';
import { getApolloClient } from '@/services/apollo-client';
import { ApolloError, FetchResult } from '@apollo/client';
import { client } from '@/providers/ApolloProvider';
import { addQueueToCache } from '@/services/queue';

export function getHostQueues(hostId: QueueHost['id']): Promise<Queue[]> {
  const client = getApolloClient();
  return client
    .query({
      query: GetHostQueuesDocument,
      variables: {
        id: hostId,
      },
    })
    .then((result) => {
      if (result.error) throw result.error;
      return (result.data?.host?.queues ?? []) as Queue[];
    });
}

export function getHostChannels(hostId: QueueHost['id']): Promise<NotificationChannel[]> {
  const client = getApolloClient();
  return client
    .query({
      query: GetHostChannelsDocument,
      variables: {
        hostId,
      },
    })
    .then((result) => {
      if (result.error) throw result.error;
      return (result.data?.host?.channels ?? []) as NotificationChannel[];
    });
}

export function registerQueue(
  hostId: QueueHost['id'],
  prefix: string,
  name: string,
  mustExist = true
): Promise<Queue> {
  return client
    .mutate({
      mutation: RegisterQueueDocument,
      variables: {
        hostId,
        name,
        prefix,
        ...(mustExist && { checkExists: mustExist }),
      },
      update(cache, { data }) {
        const queue = data?.registerQueue as Queue;
        if (queue) {
          addQueueToCache(cache, queue as Queue);
        }
      },
    })
    .then((result: FetchResult<RegisterQueueMutation>) => {
      if (result.errors) {
        throw new ApolloError({
          graphQLErrors: result.errors,
        });
      }
      const queue = result?.data?.registerQueue || null;
      return queue as Queue;
    });
}

export function discoverQueues(
  hostId: QueueHost['id'],
  prefix?: string,
  unregisteredOnly?: boolean
): Promise<DiscoverQueuesPayload[]> {
  return client
    .query({
      query: DiscoverQueuesDocument,
      variables: {
        hostId,
        prefix,
        unregisteredOnly,
      },
    })
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.host?.discoverQueues ?? [];
    });
}

export function getHostData(): Promise<QueueHost[]> {
  const client = getApolloClient();
  return client
    .query({
      query: GetHostsAndQueuesDocument,
    })
    .then((result) => {
      if (result.error) throw result.error;
      return (result.data?.hosts ?? []) as QueueHost[];
    });
}

export function getRedisInfo(): Promise<RedisStatsFragment> {
  const client = getApolloClient();
  return client
    .query({
      query: GetRedisStatsDocument,
    })
    .then((result) => {
      if (result.error) throw result.error;
      return result.data?.host?.redis as RedisStatsFragment;
    });
}
