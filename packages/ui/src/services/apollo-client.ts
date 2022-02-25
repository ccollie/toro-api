import { useMemo } from 'react';
import {
  ApolloClient,
  FieldFunctionOptions,
  FieldMergeFunction,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  Reference,
  StoreObject,
} from '@apollo/client';
import { apiUrl } from '../config';
import type {
  Job,
  Metric,
  Queue,
  QueueWorker,
  RepeatableJob,
  StatsSnapshot,
} from '@/types';
import { SafeReadonly } from '@apollo/client/cache/core/types/common';

let apolloClient: ApolloClient<NormalizedCacheObject>;

const isServer = typeof window === 'undefined';

function mergeArrayByField<T extends StoreObject | Reference>(
  field = 'id',
): FieldMergeFunction<T[]> {
  return (
    existing: SafeReadonly<T[]> | undefined,
    incoming: SafeReadonly<T[]>,
    { readField, mergeObjects },
  ): SafeReadonly<T[]> => {
    const merged: any[] = existing ? existing.slice(0) : [];
    const idToIndex: Record<string, number> = Object.create(null);
    if (existing) {
      existing.forEach((item, index) => {
        const id = readField<string>(field, item) ?? '';
        idToIndex[id] = index;
      });
    }
    incoming.forEach((item) => {
      const id = readField<string>(field, item);
      if (id === undefined) return;
      const index = idToIndex[id];
       // Merge the new queue data with the existing queue data.
      merged[index] = mergeObjects(merged[index], item);
    });
    return merged;
  };
}

function getTypeReferenceFn(name: string) {
  return (_: unknown, { args, toReference }: FieldFunctionOptions) => {
    return toReference({
      __typename: name,
      id: args?.id,
    });
  };
}

const typePolicies = {
  Query: {
    fields: {
      host: getTypeReferenceFn('QueueHost'),
      queue: getTypeReferenceFn('Queue'),
      job: getTypeReferenceFn('Job'),
    },
  },
  Job: {
    merge: true,
    fields: {
      logs: {
        merge: true,
      },
      opts: {
        merge: true,
      },
      data: {
        merge: true,
      },
    },
  },
  RepeatableJob: {
    merge: true,
    keyFields: ['key'],
  },
  QueueHost: {
    merge: true,
    fields: {
      histogram: {
        merge: true,
      },
      redis: {
        merge: true,
      },
      jobCounts: {
        merge: true,
      },
      queues: {
        merge: mergeArrayByField<Queue>(),
      },
      stats: {
        merge: mergeArrayByField<StatsSnapshot>('startTime'),
      },
      lastStatsSnapshot: {
        merge: true,
      },
      workers: {
        merge: mergeArrayByField<QueueWorker>(),
      },
    },
  },
  Queue: {
    merge: true,
    fields: {
      histogram: {
        merge: true,
      },
      jobs: {
        merge: mergeArrayByField<Job>(),
      },
      jobCounts: {
        merge: true,
      },
      lastStatsSnapshot: {
        merge: true,
      },
      metrics: {
        merge: mergeArrayByField<Metric>(),
      },
      repeatableJobs: {
        merge: mergeArrayByField<RepeatableJob>('key'),
      },
      statsAggregate: {
        merge: true,
      },
      workers: {
        merge: mergeArrayByField<QueueWorker>(),
      },
      throughput: {
        merge: true,
      },
      errorRate: {
        merge: true,
      },
    },
  },
  QueueWorker: {
    merge: true,
  },
};

function createApolloClient(): ApolloClient<NormalizedCacheObject> {
  return new ApolloClient({
    ssrMode: isServer, // set to true for SSR
    cache: new InMemoryCache({
      typePolicies,
      possibleTypes: {
        NotificationChannel: [
          'MailNotificationChannel',
          'SlackNotificationChannel',
          'WebhookNotificationChannel',
        ],
        RuleCondition: [
          'ChangeCondition',
          'PeakCondition',
          'ThresholdCondition',
        ],
        RuleEvaluationState: [
          'ChangeRuleEvaluationState',
          'PeakRuleEvaluationState',
          'ThresholdRuleEvaluationState',
        ],
      },
    }),
    link: new HttpLink({
      uri: `${apiUrl}`,
    }),
  });
}

export function initializeApollo(): ApolloClient<NormalizedCacheObject> {
  const _apolloClient = apolloClient ?? createApolloClient();

  // For SSG and SSR always create a new Apollo Client
  if (isServer) return _apolloClient;

  // Create the Apollo Client once in the client
  if (!apolloClient) apolloClient = _apolloClient;
  return _apolloClient;
}

export function useApollo(): ApolloClient<NormalizedCacheObject> {
  return useMemo(() => initializeApollo(), []);
}

// client side only use
export function getApolloClient(): ApolloClient<NormalizedCacheObject> {
  return apolloClient ?? initializeApollo();
}
