import { LocationGenerics, Queue, QueueFilter } from '@/types';
import { useCallback } from 'react';
import { useMatch, useNavigate } from 'react-location';
import { useStore } from 'src/stores';
import {
  DefaultQueueFilter, filterQueues,
  filtersEqual,
} from '../filters';
import { useQueueFiltersStore } from '../stores/queues-filter';

export function useHostQueueFilter(id?: string) {
  const navigate = useNavigate();

  const match = useMatch<LocationGenerics>();
  const hostId = id ?? match.params.hostId;
  const filter = useQueueFiltersStore(useCallback(state => state.ensureHost(hostId), [hostId]));
  const updateFilterInStore = useQueueFiltersStore((state) => state.updateHostFilter);
  const excludeQueue = useQueueFiltersStore((state) => state.excludeQueue);
  const findQueue = useStore((state) => state.findQueue);

  const updateFilter = useCallback((newFilter: QueueFilter): QueueFilter => {
    if (filtersEqual(filter, newFilter)) {
      return filter;
    }
    return updateFilterInStore(hostId, newFilter);
  }, [hostId]);

  const hideQueue = useCallback((queueId: string) => {
    excludeQueue(hostId, queueId);
  }, [hostId]);

  const isQueueHidden = useCallback((queue: Queue | string): boolean => {
    let needle: Queue | undefined;
    if (typeof queue === 'string') {
      needle = findQueue(queue);
    } else {
      needle = queue;
    }
    if (!needle) return true;
    const res = filterQueues([needle], filter);
    return !!res.length;
  }, [hostId]);

  function getFilterFromRoute(): QueueFilter {
    const result: QueueFilter = { ... DefaultQueueFilter, ...filter };

    const { search: { sortBy, sortOrder, qids = [], excludeIds = [], queueStatuses = [] } } = match;
    if (sortBy) {
      result.sortBy = sortBy;
    }
    if (sortOrder) {
      result.sortOrder = sortOrder;
    }
    if (excludeIds.length > 0) {
      result.exclude = excludeIds;
    }
    if (qids.length > 0) {
      result.include = qids;
    }
    if (queueStatuses.length > 0) {
      result.statuses = queueStatuses;
    }
    return result;
  }

  const doNavigate = useCallback((newFilter: QueueFilter) => {
    newFilter = updateFilter(newFilter);
    navigate({
      to: '.',
      search: (old) => {
        const newSearch = { ...old };

        if (!newFilter.statuses?.length) {
          delete newSearch.statuses;
        } else {
          newSearch.queueStatuses = newFilter.statuses;
        }
        if (newFilter.sortOrder && newFilter.sortBy) {
          newSearch.sortBy = newFilter.sortBy;
          newSearch.sortOrder = newFilter.sortOrder;
        }
        if (newFilter.include?.length) {
          newSearch.qids = newFilter.include;
        } else {
          delete newSearch.qids;
        }
        if (newFilter.exclude?.length) {
          newSearch.excludeIds = newFilter.exclude;
        } else {
          delete newSearch.excludeIds;
        }
        if (newFilter.statuses?.length) {
          newSearch.statuses = newFilter.statuses;
        } else {
          delete newSearch.statuses;
        }
        return newSearch;
      },
      replace: true,
    });
  }, [hostId]);


  return {
    getFilterFromRoute,
    filter,
    hideQueue,
    isQueueHidden,
    updateFilter,
    navigate: doNavigate,
  };
}
