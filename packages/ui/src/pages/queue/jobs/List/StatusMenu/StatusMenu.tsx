import React from 'react';
import { EmptyJobCounts } from '@/constants';
import { calcJobCountTotal } from 'src/services';
import s from './StatusMenu.module.css';
import type { Queue, JobStatus, JobSearchStatus } from 'src/types';
import { STATUS_LIST } from 'src/constants/status-list';
import { Link } from '@tanstack/react-location';

type BadgeProps = {
  queue: Queue;
  status: JobSearchStatus | 'latest';
};

function CountBadge({queue, status} : BadgeProps) {

  function getJobTotal(): number {
    if (status === 'latest') {
      return calcJobCountTotal(queue.jobCounts ?? {});
    }
    return calcJobCountTotal(queue.jobCounts ?? {}, status);
  }

  function getJobCount(status: string): number {
    let count = 0;
    if (status === 'paused') {
      if (queue.isPaused) {
        count = getJobTotal();
      }
    } else if (status === 'latest'){
      count = getJobTotal();
    } else {
      count = ((queue.jobCounts ?? EmptyJobCounts) as any)[status] ?? 0;
    }
    return count;
  }

  const count = getJobCount(status);
  if (count === 0) {
    return null;
  }
  return (
    <span className={s.badge}>{count}</span>
  );
}

export const StatusMenu = ({ queue, status, page }: {
  queue: Queue;
  status: JobSearchStatus;
  page?: number;
}) => {

  page = page || 1;

  function getClassName(linkStatus: JobStatus): string | undefined {
    const isActive = status === linkStatus;
    return isActive ? s.active : undefined;
  }

  return (
    <div className={s.statusMenu}>
      {STATUS_LIST.map((status) => {
        const isLatest = status  === 'latest';
        const displayStatus = status.toLocaleUpperCase();
        const search = isLatest ? { page } : { status, page };
        return (
          <Link
            to='.'
            search={search}
            className={getClassName(status)}
            key={`${queue.name}-${status}`}
          >
            <span title={displayStatus}>{displayStatus}</span>
            <CountBadge queue={queue} status={status} />
          </Link>
        );
      })}
    </div>
  );
};
