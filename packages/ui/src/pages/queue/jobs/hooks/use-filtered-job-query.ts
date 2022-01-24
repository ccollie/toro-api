import { useEffect, useState } from 'react';
import type { JobFragment, JobStatus } from '@/types';
import { usePagination, useToast } from 'src/hooks';
import { getJobsByFilter } from '@/services/queue/api';

interface UseFilteredJobQueryProps {
  queueId: string;
  status: JobStatus;
  filter?: string;
  page?: number;
  pageSize?: number;
}

export const useFilteredJobQuery = (props: UseFilteredJobQueryProps) => {
  const { page: _page = 1, pageSize: _pageSize = 10 } = usePagination();
  const toast = useToast();

  const {
    queueId,
    status,
    filter: _filter,
    page = _page,
    pageSize = _pageSize,
  } = props;

  const [loading, setLoading] = useState(true);
  const [called, setCalled] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(Math.min(page, 1));
  const [totalPages, setTotalPages] = useState(Math.min(page, 1));

  const [data, setData] = useState<JobFragment[]>([]);

  const [cursor, setCursor] = useState<string>();
  const [filter] = useState<string>((_filter ?? '').trim());
  const [hasNext, setHasNext] = useState<boolean>(false);

  useEffect(() => {
    if (cursor) {
      setHasNext(true);
    } else if (!filter) {
      setHasNext(false);
    } else {
      setHasNext(page < totalPages);
    }
  }, [cursor, page, totalPages]);

  useEffect(() => {
    setCursor(undefined);
    clearPagination();
    if (filter) {
      fetchByCriteria();
    } else {
      setCalled(false);
      setData([]);
    }
  }, [filter, status]);

  function getSessionKey(suffix: string): string {
    const rest = cursor ? [cursor] : [];
    rest.push(suffix);
    return `filtered-jobs-${queueId}:${status}:${rest.join(':')}`;
  }

  function clearPagination() {
    setTotalPages(0);
    setLastPage(0);
    setTotal(0);
  }

  function recalcPagination(total: number) {
    setTotal(total);
    const pages = total === 0 ? 0 : Math.floor(total / pageSize);
    setTotalPages(pages);
  }

  function clear() {
    setCursor(undefined);
    clearPagination();
    setData([]);
  }

  useEffect(() => {
    clear();
    // refresh
  }, [pageSize]);

  function refresh() {
    if (called && !loading) {
      setCalled(false);
      clear();
      fetchByCriteria();
    }
  }

  async function fetch(): Promise<JobFragment[]> {
    const { jobs, cursor: _cursor, total } = await getJobsByFilter(queueId, {
      status,
      count: pageSize,
      cursor,
      criteria: cursor ? undefined : filter,
    });
    if (_cursor !== cursor) {
      clearPagination();
    }
    setLastPage(page);
    recalcPagination(total);
    setCursor(_cursor ?? undefined);
    return jobs;
  }

  function fetchByCriteria(): void {
    setLoading(true);
    fetch()
      .then(jobs => {
        setData(jobs);
        setCalled(true);
        setLastPage(page);
        recalcPagination(total);
        storePageInSession(page);
      })
      .catch((err) => {
        const msg = (err instanceof Error) ? err.message : `${err}`;
        toast.error(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function storePageInSession(index: number): void {
    if (index > 0) {
      const key = getSessionKey(`page:${index}`);
      if (data && data.length) {
        try {
          const items = JSON.stringify(data);
          sessionStorage.setItem(key, items);
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  function getPageFromSession(index: number): void {
    if (index > 0) {
      const key = getSessionKey(`page:${index}`);
      const data = sessionStorage.getItem(key);
      if (data && data.length) {
        try {
          const items = JSON.parse(data);
          if (Array.isArray(items)) {
            setData(items as JobFragment[]);
            return;
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    setData([]);
  }

  async function getPage(index: number): Promise<JobFragment[]> {
    if (index < 0 || index > totalPages) {
      return [];
    }
    if (index === page) {
      return data;
    }
    if (index < page && index > 0) {
      getPageFromSession(index);
      return data;
    }
    if (index === page + 1) {
      await fetchByCriteria();
      return data;
    }
    return []
  }

  function getPreviousPage() {
    const index = Math.max(
      0,
      page - 1,
    );
    getPageFromSession(index);
  }

  function getNextPage() {
    console.log('goto next, page = ' + page + ', lastPage = ' + lastPage);
    if (page === lastPage) {
      if (cursor) {
        // console.log('fetching next from cursor....');
        return fetchByCriteria();
      }
    }
    const index = Math.min(lastPage, page + 1);
    return getPageFromSession(index);
  }

  return {
    getPreviousPage,
    getNextPage,
    getPage,
    hasNext,
    refresh,
    fetch,
    total,
    data,
    loading,
    called
  }
};

export default useFilteredJobQuery;
