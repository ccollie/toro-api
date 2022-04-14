import { useShallowEffect } from '@mantine/hooks';
import { useMatchedBreakpoints, useWhyDidYouUpdate } from '@/hooks';
import { getJobDuration, getJobWaitTime, normalizeJobName } from '@/lib';
import { Breakpoint, JobSearchStatus, Queue } from '@/types';
import { Checkbox } from '@mantine/core';
import { TableNode } from '@table-library/react-table-library';
import { Column } from '@table-library/react-table-library/compact';
import { Select } from '@table-library/react-table-library/select';
import React, { Fragment, useMemo, useState } from 'react';
import type { Job, JobFragment } from '@/types';
import { JobProgress, RelativeDateFormat } from '@/components';
import { Timestamp } from 'src/components/Timestamp';
import JobId from '../../JobId';
import JobActions from '../../JobActions';
import { formatDuration } from '@/lib/dates';
import { CalendarIcon, ClockIcon } from '@/components/Icons';

export type JobNode = TableNode & {
  job: JobFragment;
};

const baseFields = ['id', 'name', 'timestamp', 'attempts', 'actions'];
const FIELDS: Record<JobSearchStatus, string[]> = {
  active: [...baseFields, 'wait', 'started', 'progress'],
  completed: [
    ...baseFields,
    'completed',
    'wait',
    'started',
    'runtime',
  ],
  delayed: [...baseFields, 'nextRun'],
  failed: [...baseFields, 'wait', 'completed', 'runtime'],
  paused: [...baseFields, 'started'],
  waiting: [...baseFields, 'completed'],
  'waiting_children': [...baseFields, 'completed'],
};

const Duration = ({
  job,
  showIcon = true,
}: {
  job: Job | JobFragment;
  showIcon?: boolean;
}) => {
  const duration = getJobDuration(job);
  if (!duration) {
    return null;
  }

  return (
    <Fragment>
      {showIcon && <ClockIcon style={{ display: 'inline-block' }} />}{' '}
      {formatDuration(duration)}
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

export type JobColumnType = Column & {
  width?: string | number;
  ellipsis?: boolean;
  className?: string;
  key: string;
  responsive?: Array<Breakpoint>;
};

export function getColumns(
  queueId: Queue['id'],
  status: JobSearchStatus,
  select: Select,
): JobColumnType[] {
  const columns: JobColumnType[] = [
    {
      label: 'ID',
      ellipsis: true,
      resize: true,
      key: 'id',
      cellProps: {
        'width': '44px',
      },
      renderCell: (node: TableNode) => <JobId id={node.job.id} />,
      select: {
        renderHeaderCellSelect: () => (
          <Checkbox
            checked={select.state.all}
            indeterminate={!select.state.all && !select.state.none}
            onChange={select.fns.onToggleAll}
          />
        ),
        renderCellSelect: (item) => (
          <Checkbox
            checked={select.state.ids.includes(item.id)}
            onChange={() => select.fns.onToggleById(item.id)}
          />
        ),
      },
    },
    {
      label: 'Name',
      key: 'name',
      cellProps: {
        width: '105px',
      },
      resize: true,
      renderCell: (node: TableNode) => (
        <Fragment>{normalizeJobName(node.job)}</Fragment>
      ),
    },
    {
      label: 'Timestamp',
      key: 'timestamp',
      cellProps: {
        width: DateTimeWidth,
      },
      renderCell: (node: TableNode) => <Timestamp value={node.job.timestamp} />,
    },
    {
      label: 'Waited',
      key: 'wait',
      cellProps: {
        width: '55px',
      },
      renderCell: (node: TableNode) => (
        <WaitTime job={node.job} key={`wait-${node.job.id}`} />
      ),
    },
    {
      label: 'Started',
      key: 'started',
      responsive: ['md'],
      cellProps: {
        width: DateTimeWidth,
      },
      renderCell: (node: TableNode) => <Timestamp value={node.job.processedOn} relative={true} />,
    },
    {
      label: 'Completed',
      key: 'completed',
      cellProps: {
        width: DateTimeWidth,
      },
      renderCell: (node: TableNode) => <Timestamp value={node.job.finishedOn} relative={true}/>,
    },
    {
      label: 'Runtime',
      key: 'runtime',
      cellProps: {
        width: 60,
      },
      renderCell: (node: TableNode) => (
        <Duration job={node.job} key={`duration-${node.job.id}`} />
      ),
    },
    {
      label: 'Next Run',
      key: 'nextRun',
      cellProps: {
        width: DateTimeWidth,
      },
      renderCell: (node: TableNode) => {
        const { job } = node;
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
      label: 'Progress',
      key: 'progress',
      cellProps: {
        'width': '60px',
        'text-align': 'left',
      },
      renderCell: (node: TableNode) => (
        <JobProgress value={node.job.progress || 0} size="small" />
      ),
    },
    {
      label: 'Attempts',
      key: 'attempts',
      cellProps: {
        width: '38px',
        'text-align': 'right',
      },
      renderCell: (node: TableNode) => <Attempts job={node.job} />,
    },
    {
      label: 'Actions',
      resize: true,
      key: 'actions',
      // pinRight: true,
      // cellProps: {
      //   'text-align': 'right',
      //   'min-width': '50px',
      // },
      renderCell: (node: TableNode) => (
        <JobActions job={node.job} queueId={queueId} />
      ),
    },
  ];

  return columns.filter((column) => FIELDS[status].includes(column.key + ''));
}

export const useColumns = (
  queueId: string,
  status: JobSearchStatus,
  select: Select,
): JobColumnType[] => {
  const [breaker, setBreaker] = useState(1);
  const breakpointMatched = useMatchedBreakpoints();

  useWhyDidYouUpdate('useColumns', {
    queueId,
    status,
    select,
  });

  // used only to trigger re-memoization on breakpoint change
  useShallowEffect(() => {
    setBreaker(breaker + 1);
  }, [breakpointMatched]);

  return useMemo(() => {
    const fields = getColumns(queueId, status, select);
    return fields.filter((field) => {
      if (field.responsive?.length) {
        return !!field.responsive.find(
          (breakpoint) => breakpointMatched[breakpoint],
        );
      }
      return true;
    });
  }, [breaker, queueId, status, select]);
};
