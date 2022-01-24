import React, { useMemo } from 'react';
import { EmptyJobCounts } from '@/constants';
import s from './StatusMenu.module.css';
import type { Queue, Status } from 'src/types';
import { STATUS_LIST } from 'src/constants/status-list';
import { Link } from 'react-location';

// For ref

export const StatusMenu = ({ queue, status }: {
  queue: Queue;
  status: Status;
}) => {

  function getJobTotal(): number {
    const keys = Object.keys(queue.jobCounts ?? {});
    return keys.reduce((acc, key) => {
      const count = (queue.jobCounts as any)[key] ?? 0;
      return acc + (Number.isInteger(count) ? count : 0);
    }, 0);
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

  function CountBadge({status} : {status: string}) {
    const count = getJobCount(status);
    if (count === 0) {
      return null;
    }
    return (
      <span className={s.badge}>{count}</span>
    );
  }

  function getClassName(linkStatus: Status): string | undefined {
    const isActive = status === linkStatus;
    return isActive ? s.active : undefined;
  }

  return (
    <div className={s.statusMenu}>
      {STATUS_LIST.map((status) => {
        const isLatest = status === 'latest';
        const displayStatus = status.toLocaleUpperCase();
        const search = useMemo(() => isLatest ? {} : { status }, [status]);
        return (
          <Link
            to='.'
            search={search}
            className={getClassName(status)}
            key={`${queue.name}-${status}`}
            replace={true}
          >
            <span title={displayStatus}>{displayStatus}</span>
            <CountBadge status={status} />
          </Link>
        );
      })}
    </div>
  );
};
