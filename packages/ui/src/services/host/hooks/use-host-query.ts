import type {
  HostQueuesQuery,
  Queue,
  QueueHost,
  HostQueuesQueryVariables,
  QueueFilter,
} from '@/types';
import { HostQueuesDocument } from '@/types';
import { useInterval } from '@/hooks';
import { useLazyQuery } from '@apollo/client';
import { usePreferencesStore } from '@/stores';
import { useHost } from './use-host';
import { filterQueues, sortQueues } from '../filters';
import { useEffect, useState } from 'react';

export const useHostQuery = (
  id: QueueHost['id'],
  filter: QueueFilter,
  statsRange = 'last_hour',
) => {
  const [range] = useState(statsRange);
  const [filteredQueues, setFilteredQueues] = useState<Queue[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  // const [error, setError] = useState<ApolloError | undefined>();
  const [called, setCalled] = useState(false);
  const hostId = id;

  const { host, updateHost } = useHost(hostId);

  const pollInterval = usePreferencesStore((state) => state.pollingInterval);

  type TVariables = HostQueuesQueryVariables;

  const [loadFn, { loading, data: _data }] = useLazyQuery(HostQueuesDocument, {
    variables: getVariables(),
    fetchPolicy: 'cache-and-network',
    onCompleted(data) {
      updateState(data);
    },
  });

  const { stop, start } = useInterval(
    refresh,
    pollInterval,
    { immediate: true, cancelOnUnmount: true },
  );

  // todo: debounce this
  function refresh(): void {
    const variables = getVariables();
    loadFn({ variables });
  }

  function getVariables(): TVariables {
    const variables: TVariables = {
      id,
      range,
    };
    const { sortOrder, sortBy, ...rest } = filter;
    variables['filter'] = rest;
    return variables;
  }

  function handleSort() {
    const sorted = sortQueues(filter, queues);
    setFilteredQueues(sorted);
  }

  function updateState(data: HostQueuesQuery) {
    if (data) {
      setCalled(true);
      const host = (data.host || null) as QueueHost;
      let queues = (host?.queues ?? []) as Queue[];
      setQueues(queues);
      queues = sortQueues(filter, queues);
      updateHost(host);
      setFilteredQueues(queues);
    }
  }

  useEffect(() => {
    if (_data && !loading) {
      updateState(_data);
    }
  }, [_data, loading]);

  useEffect(handleSort, [filter.sortBy, filter.sortOrder]);

  useEffect(() => {
    // todo: debounce this ???
    // optimistic update
    const filtered = filterQueues(queues, filter);
    const sorted = sortQueues(filter, filtered);
    setFilteredQueues(sorted);

    stop();
    (!loading) && refresh();
    start();
  }, [
    filter.prefixes,
    filter.statuses,
    filter.search,
    range,
    filter.exclude,
    filter.include,
  ]);

  function removeQueue(id: string) {
    setFilteredQueues(filteredQueues.filter((q) => q.id !== id));
    setQueues(queues.filter((q) => q.id !== id));
    // todo: remove from store
  }

  return {
    refresh,
    removeQueue,
    host,
    queues,
    filteredQueues,
    loading,
    called,
    // error,
  };
};
