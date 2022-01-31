import { SortOrderEnum } from '@/types';
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
    page: _page = 1,
    sortOrder = SortOrderEnum.Asc,
    pageSize = usePreferencesStore((state) => state.pageSize)
  } = useSearch<LocationGenerics>();

  const getStatus = usePreferencesStore((state) => state.getQueueStatus);
  const status = searchStatus ?? getStatus(queueId);

  const page = Math.min(1, _page);
  return { queueId, status, page, pageSize, jobFilter, jobView, sortOrder };
}
