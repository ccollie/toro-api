import type { LocationGenerics } from '@/types';
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

  const getStatus = usePreferencesStore((state) => state.getQueueStatus);
  const status = searchStatus ?? getStatus(queueId);

  return { queueId, status, page, pageSize, jobFilter, jobView };
}
