import {
  format,
  formatDistance as _formatDistance,
  getYear,
  isToday,
  parseISO,
} from 'date-fns';
import React from 'react';
import { isJobFailed } from 'src/lib';
import s from './Timeline.module.css';
import type { Job as AppJob, JobFragment, JobSearchStatus } from 'src/types';

type TimeStamp = string | number | Date;

const formatDate = (ts: TimeStamp) => {
  if (typeof ts === 'string') {
    ts = parseISO(ts);
  }
  if (isToday(ts)) {
    return format(ts, 'HH:mm:ss');
  }

  return getYear(ts) === getYear(new Date())
    ? format(ts, 'MM/dd HH:mm:ss')
    : format(ts, 'MM/dd/yyyy HH:mm:ss');
};

function formatDistance(ts: TimeStamp, base: TimeStamp): string {
  if (typeof ts === 'string') {
    ts = parseISO(ts);
  }
  if (typeof base === 'string') {
    base = parseISO(base);
  }
  return _formatDistance(ts, base, {
    includeSeconds: true,
  });
}

export const Timeline = function Timeline({
  job,
  status,
}: {
  job: AppJob | JobFragment;
  status: JobSearchStatus;
}) {
  const isFailed = isJobFailed(job);
  return (
    <div className={s.timelineWrapper}>
      <ul className={s.timeline}>
        <li>
          <small>Added at</small>
          <time>{formatDate(job.timestamp || 0)}</time>
        </li>
        {!!job.delay && job.delay > 0 && status === 'delayed' && (
          <li>
            <small>Will run at</small>
            <time>
              <time>{formatDate((job.timestamp || 0) + job.delay)}</time>
            </time>
          </li>
        )}
        {!!job.processedOn && (
          <li>
            <small>
              {job.delay && job.delay > 0 ? 'delayed for ' : ''}
              {formatDistance(job.processedOn, job.timestamp || 0)}
            </small>
            <small>Process started at</small>
            <time>{formatDate(job.processedOn)}</time>
          </li>
        )}
        {!!job.finishedOn && (
          <li>
            <small>
              {formatDistance(job.finishedOn, job.processedOn || 0)}
            </small>
            <small>
              {isFailed && status !== 'active' ? 'Failed' : 'Finished'} at
            </small>
            <time>{formatDate(job.finishedOn)}</time>
          </li>
        )}
      </ul>
    </div>
  );
};
