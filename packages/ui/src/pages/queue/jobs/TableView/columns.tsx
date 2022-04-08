import { useShallowEffect } from '@mantine/hooks';
import { useMatchedBreakpoints } from '@/hooks';
import { getJobDuration, getJobWaitTime, normalizeJobName } from '@/lib';
import { Breakpoint, JobSearchStatus, Queue } from '@/types';
import { Group, Tooltip } from '@mantine/core';
import { format, isToday } from 'date-fns';
import React, { Fragment, useMemo, useState } from 'react';
import type { Job, JobFragment } from '@/types';
import { JobProgress, RelativeDateFormat } from '@/components';
import JobId from '../JobId';
import JobActions from '../JobActions';
import { formatDuration, parseDate, relativeFormat } from '@/lib/dates';
import { CalendarIcon, ClockIcon } from '@/components/Icons';

const FIELDS: Record<JobSearchStatus, string[]> = {
  [JobSearchStatus.Active]: [
    'id',
    'name',
    'timestamp',
    'wait',
    'processedOn',
    'progress',
    'actions',
  ],
  [JobSearchStatus.Completed]: [
    'id',
    'name',
    'finishedOn',
    'timestamp',
    'wait',
    'processedOn',
    'runtime',
    'attemptsMade',
    'actions',
  ],
  [JobSearchStatus.Delayed]: [
    'id',
    'name',
    'attemptsMade',
    'timestamp',
    'nextRun',
    'actions',
  ],
  [JobSearchStatus.Failed]: [
    'id',
    'attemptsMade',
    'name',
    'timestamp',
    'wait',
    'finishedOn',
    'runtime',
    'actions',
  ],
  [JobSearchStatus.Paused]: [
    'id',
    'attemptsMade',
    'name',
    'timestamp',
    'processedOn',
    'actions',
  ],
  [JobSearchStatus.Waiting]: ['id', 'name', 'timestamp', 'finishedOn', 'actions'],
  [JobSearchStatus.WaitingChildren]: ['id', 'name', 'timestamp', 'finishedOn', 'actions'],
};

const JobDate = ({ value }: { value: number | string }) => {
  if (!value) {
    return null;
  }

  const dt = parseDate(value);
  const _today = isToday(dt);
  const label = relativeFormat(dt);
  const time = format(dt, 'HH:mm:ss');
  const date = format(dt, 'MMM dd, yy');

  return (
    <Tooltip position="top" label={label} aria-label={label}>
      {_today ? (
        <span>{time}</span>
      ) : (
        <Group direction="column" position="center" spacing="xs">
          <span>{date}</span>
          <span>{time}</span>
        </Group>
      )}
    </Tooltip>
  );
};

const Duration = ({ job, showIcon = true }: { job: Job | JobFragment; showIcon?: boolean }) => {
  const duration = getJobDuration(job);
  if (!duration) {
    return null;
  }

  return (
    <Fragment>
      {showIcon && <ClockIcon style={{ display: 'inline-block' }}/>} {formatDuration(duration)}
    </Fragment>
  );
};

const WaitTime = ({ job }: { job: Job | JobFragment }) => {
  const duration = getJobWaitTime(job);
  if (!duration) {
    return null;
  }

  return (
    <Fragment>
      <ClockIcon /> {formatDuration(duration)}
    </Fragment>
  );
};

const Attempts = ({ job }: { job: Job | JobFragment }) => {
  const total = job.opts?.attempts || 0;
  const value = `${job.attemptsMade + 1}` + (total ? `/${total}` : '');
  return job.attemptsMade > 0 ? <span>{value}</span> : null;
};

const DateTimeWidth = 80;

export type JobColumnType = {
  title: string;
  dataIndex?: keyof JobFragment;
  key: string;
  width?: string | number;
  render?: (record: Job | JobFragment) => React.ReactNode;
  ellipsis?: boolean;
  align?: 'left' | 'right' | 'center' | 'justify';
  fixed?: 'left' | 'right';
  className?: string;
  responsive?: Array<Breakpoint>;
};

export function Header({ column } : { column: JobColumnType }) {
  const className=
    'group px-6 py-3 text-left text-xs font-medium ' +
    'text-gray-500 uppercase tracking-wider';

  return (
    <th
      scope="col"
      className={className}>
      <div className="flex items-center justify-between">
        {column.title}
      </div>
    </th>
  );
}

export function Cell({ job, column } : { job: Job | JobFragment; column: JobColumnType }) {
  const { dataIndex, render, align = 'left',  className = '', width } = column;
  return (
    <td className={`p-4 whitespace-no-wrap ${className}`} style={{ width }}>
      <span style={{ textAlign: align }} className={className}>
        {render ? render(job) : (dataIndex ? job[dataIndex] : null)}
      </span>
    </td>
  );
}

export function getColumns(
  queueId: Queue['id'],
  status: JobSearchStatus,
): JobColumnType[] {
  const columns: JobColumnType[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: '44px',
      key: 'job-id',
      ellipsis: true,
      render: (job: JobFragment) => <JobId id={job.id} />,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      width: '105px',
      key: 'job-name',
      ellipsis: true,
      render: (job: JobFragment) => <Fragment>{normalizeJobName(job)}</Fragment>,
    },
    {
      title: 'Created',
      dataIndex: 'timestamp',
      width: DateTimeWidth,
      key: 'created',
      responsive: ['md'],
      render: (job: JobFragment) => <JobDate value={job.timestamp} />,
    },
    {
      title: 'Waited',
      dataIndex: 'processedOn',
      width: '55px',
      key: 'wait-time',
      render: (job: JobFragment) => <WaitTime job={job} key={`wait-${job.id}`} />,
    },
    {
      title: 'Started',
      dataIndex: 'processedOn',
      width: DateTimeWidth,
      key: 'started',
      responsive: ['md'],
      render: (job: JobFragment) => <JobDate value={job.processedOn} />,
    },
    {
      title: 'Completed',
      dataIndex: 'finishedOn',
      key: 'completed',
      width: DateTimeWidth,
      render: (job: JobFragment) => <JobDate value={job.finishedOn} />,
    },
    {
      title: 'Runtime',
      dataIndex: 'finishedOn',
      key: 'runtime',
      width: 60,
      render: (job: JobFragment) => <Duration job={job} key={`duration-${job.id}`} />,
    },
    {
      title: 'Next Run',
      key: 'next-run',
      width: DateTimeWidth,
      render: (job: JobFragment) => {
        const { timestamp = 0, delay = 0 } = job;
        const value = Number(timestamp) + Number(delay);
        if (!value) return <Fragment>{'--'}</Fragment>;
        return (
          <Fragment>
            <CalendarIcon />
            <RelativeDateFormat value={value} />
          </Fragment>
        );
      },
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      align: 'left',
      width: '80px',
      key: 'progress',
      render: (job: JobFragment) => (
        <JobProgress value={job.progress || 0} size="small" />
      ),
    },
    {
      title: 'Attempts',
      dataIndex: 'attemptsMade',
      width: '38px',
      align: 'center',
      key: 'attemptsMade',
      render: (job: JobFragment) => <Attempts job={job} />,
    },
    {
      title: 'Actions',
      dataIndex: 'id',
      fixed: 'right',
      align: 'right',
      key: 'actions',
      width: 50,
      render: (job: JobFragment) => (
        <JobActions
          job={job}
         queueId={queueId}/>
      ),
    },
  ];

  return columns.filter((column) =>
    FIELDS[status].includes(String(column.dataIndex)),
  );
}

export const useColumns = (queueId: string, status: JobSearchStatus): JobColumnType[] => {
  const [breaker, setBreaker] = useState(1);
  const breakpointMatched = useMatchedBreakpoints();

  // used only to trigger re-memoization on breakpoint change
  useShallowEffect(() => {
    setBreaker(breaker + 1);
  }, [breakpointMatched]);

  return useMemo(() => {
    const fields = getColumns(queueId, status);
    return fields.filter((field) => {
      if (field.responsive?.length) {
        return !!field.responsive.find(breakpoint => breakpointMatched[breakpoint]);
      }
      return true;
    });
  }, [breaker, queueId, status]);
};
