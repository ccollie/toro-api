import React from 'react';
import {
  ApolloClient,
  ApolloLink,
  ApolloProvider as ReactApolloProvider,
  FieldFunctionOptions,
  FieldMergeFunction,
  HttpLink,
  InMemoryCache,
} from '@apollo/client';
import { onError } from '@apollo/client/link/error';

import { SafeReadonly } from '@apollo/client/cache/core/types/common';

import type { Job, Queue, QueueWorker, RepeatableJob, StatsSnapshot } from '@/types';
import { EnvConfig } from 'src/config';

console.log('ApolloProvider.tsx, EnvConfig:', EnvConfig);
console.log('Env', import.meta.env);

const httpLink = new HttpLink({
  uri: EnvConfig.graphqlEndpoint,
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors)
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
      ),
    );

  if (networkError) console.log(`[Network error]: ${networkError}`);
});


// according to https://www.apollographql.com/docs/react/api/link/persisted-queries/#usage
// this requires an httpLink
// const persistedQueriesLink = createPersistedQueryLink({ sha256 });

// The split function takes three parameters:
//
// * A function that's called for each operation to execute
// * The Link to use for an operation if the function returns a "truthy" value
// * The Link to use for an operation if the function returns a "falsy" value
// const splitLink = ApolloLink.split(
//   ({ query }) => {
//     const definition = getMainDefinition(query);
//     return (
//       definition.kind === 'OperationDefinition' &&
//       definition.operation === 'subscription'
//     );
//   },
//   wsLink,
//   httpLink,
//   // persistedQueriesLink.concat(httpLink),
// );

const authMiddleware = new ApolloLink((operation, forward) => {
  const token = localStorage.getItem('token');
  operation.setContext({
    headers: {
      authorization: (token && `Bearer ${token}`) || null,
    },
  });

  return forward(operation);
});

function mergeArrayByField<T extends Record<string, any>>(
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
      if (typeof index === 'number') {
        // Merge the new queue data with the existing queue data.
        merged[index] = mergeObjects(merged[index], item);
      } else {
        // First time we've seen this queue in this array.
        idToIndex[id] = merged.length;
        merged.push(item);
      }
    });
    return merged;
  };
}

function getTypeReferenceFn(name: string) {
  return (_: any, { args, toReference }: FieldFunctionOptions) => {
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
      repeatableJobs: {
        merge: mergeArrayByField<RepeatableJob>('key'),
      },
      stats: {
        merge: mergeArrayByField<StatsSnapshot>('startTime'),
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


export const client = new ApolloClient({
  link: ApolloLink.from([authMiddleware, /* splitLink */ httpLink, errorLink]),
  cache: new InMemoryCache({
    typePolicies,
  }),
  defaultOptions: {
    mutate: {
      errorPolicy: 'all',
    },
  },
});

const ApolloProvider: React.FC = ({ children }) => {
  return <ReactApolloProvider client={client}>{children}</ReactApolloProvider>;
};

export default ApolloProvider;
