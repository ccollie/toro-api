import type { LocationGenerics } from '@/types';
import { useCallback } from 'react';
import { useMatch, useSearch } from 'react-location';
import { usePreferencesStore } from '@/stores';

export function useJobQueryParameters() {
  const {
    params: { queueId },
  } = useMatch<LocationGenerics>();

  const {
    status: searchStatus,
    jobView = 'card',
    jobFilter,
    page = 1,
    pageSize = usePreferencesStore((state) => state.pageSize)
  } = useSearch<LocationGenerics>();

  const status = searchStatus ?? usePreferencesStore(
    useCallback((state) => state.selectedStatuses[queueId] || 'latest', [queueId])
  );

  return { queueId, status, page, pageSize, jobFilter, jobView };
}
