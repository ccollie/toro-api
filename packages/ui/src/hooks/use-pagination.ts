import { LocationGenerics } from '@/types';
import { useNavigate, useSearch } from '@tanstack/react-location';
import { usePreferencesStore } from '@/stores';

export function usePagination() {
  const navigate = useNavigate();

  function gotoPage(selected: number, search?: Partial<LocationGenerics['Search']>) {
    const page = selected > 0 ? selected : undefined;
    navigate({
      to: '.',
      search: (old) => ({
        ...old,
        ...(search || {}),
        page
      }),
    });
  }

  const preferredPageSize = usePreferencesStore((state) => state.pageSize);

  const {
    page: _page = 1,
    pageSize = preferredPageSize,
  } = useSearch<LocationGenerics>();

  return { page: Math.min(_page, 1), pageSize, gotoPage };
}
