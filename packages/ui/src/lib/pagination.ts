import type { JobCounts, JobStatus, Queue } from '@/types';
import { EmptyJobCounts } from 'src/constants';

export interface Pagination {
  pageCount: number;
  range: {
    start: number;
    end: number;
  };
}

const JOB_PER_PAGE = 10;

export function getJobTotal(counts: JobCounts): number {
  const keys = Object.keys(counts ?? {});
  return keys.reduce((acc, key) => {
    const count = (counts as any)[key] ?? 0;
    return acc + count;
  }, 0);
}

export function getJobCountByStatus(
  queue: Queue,
  counts: JobCounts,
  status: string,
): number {
  let count = 0;
  if (status === 'paused') {
    if (queue.isPaused) {
      count = getJobTotal(counts);
    }
  } else if (status === 'latest') {
    count = getJobTotal(counts);
  } else {
    count = ((queue.jobCounts ?? EmptyJobCounts) as any)[status] ?? 0;
  }
  return count;
}

export function getJobPagination(
  statuses: JobStatus[],
  counts: JobCounts,
  currentPage: number,
): Pagination {
  const isLatestStatus = statuses.length > 1;

  function getCount(status: JobStatus): number {
    return (counts as any)[status] ?? 0;
  }

  const total = isLatestStatus
    ? statuses.reduce(
        (total, status) => total + Math.min(getCount(status), JOB_PER_PAGE),
        0,
      )
    : getCount(statuses[0]);

  const start = isLatestStatus ? 0 : (currentPage - 1) * JOB_PER_PAGE;
  const pageCount = isLatestStatus ? 1 : Math.ceil(total / JOB_PER_PAGE);

  return {
    pageCount,
    range: { start, end: start + JOB_PER_PAGE - 1 },
  };
}
