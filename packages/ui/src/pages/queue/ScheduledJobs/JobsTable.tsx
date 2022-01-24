import { LoadingOverlay, Tooltip } from '@mantine/core';
import React, { Fragment, useCallback, useMemo } from 'react';
import type { RepeatableJob } from '@/types';
import { ActionIcon } from '@/components/ActionIcon';
import { normalizeJobName } from 'src/lib';
import { JobId } from '../jobs/JobId';
import { RelativeDateFormat } from '@/components/RelativeDateFormat';
import { formatDate } from '@/lib/dates';
import { parseJSON } from 'date-fns';
import { CalendarIcon, TrashIcon } from '@/components/Icons';
import { EmptyBody, Table, TableRow, TableHead, TableCell, TableBody } from '@/components/Table';
import s from './styles.module.css';

type ColumnDef<T extends Record<string, unknown>> = {
  title: string;
  width?: number;
  dataIndex: keyof T | 'actions';
  align?: 'left' | 'right' | 'center';
  render?: (item: T) => React.ReactNode;
};

const columns: ColumnDef<RepeatableJob>[] = [
  {
    title: 'Key',
    dataIndex: 'key',
    render: (job: RepeatableJob) => {
      const key = job.key;
      return (
        <Tooltip label={key} aria-label="Job key">
          <span>{key}</span>
        </Tooltip>
      );
    },
  },
  {
    title: 'Id',
    dataIndex: 'id',
    render: (job: RepeatableJob) => {
      return <JobId id={job.id ?? ''} />;
    },
  },
  {
    title: 'Job Name',
    dataIndex: 'name',
    render: (job: RepeatableJob) => <Fragment>{normalizeJobName(job)}</Fragment>,
  },
  {
    title: 'End Date',
    dataIndex: 'endDate',
    render: (job: RepeatableJob) => {
      const val = job.endDate ? parseJSON(job.endDate) : null;
      if (val) {
        return <RelativeDateFormat value={val} icon={<CalendarIcon />} />;
      }
    },
  },
  {
    title: 'Cron',
    dataIndex: 'cron',
    render: (job: RepeatableJob) => (
      <Tooltip position="top" withArrow label={job.descr}>
        <span>{job.cron}</span>
      </Tooltip>
    ),
  },
  {
    title: 'Next',
    dataIndex: 'next',
    render: (job: RepeatableJob) => <span>{formatDate(new Date(job.next || 0))}</span>,
  },
  {
    title: 'Timezone',
    dataIndex: 'tz',
    render: (job: RepeatableJob) => <span>{job.tz}</span>,
  },
];

type DeleteFunction = (key: string) => Promise<void>;

function DeleteIcon({ jobKey, onDelete }: { jobKey: string; onDelete: DeleteFunction }) {
  const onClick = useCallback(() => onDelete(jobKey), [jobKey]);
  return (
    <ActionIcon
      key={`del-${jobKey}`}
      handler={onClick}
      confirmPrompt="Are you sure you want to delete this job?"
      baseIcon={<TrashIcon />}
    />
  );
}

function getColumns(onDelete: DeleteFunction) {
  const cols = [...columns];
  cols.push({
    title: 'Actions',
    dataIndex: 'actions',
    render: (_) => <DeleteIcon jobKey={_.key} onDelete={onDelete} />,
  });

  return cols;
}

type JobsTableProps = {
  jobs: RepeatableJob[];
  loading?: boolean;
  onDelete: DeleteFunction;
};

export const JobsTable: React.FC<JobsTableProps> = (props) => {
  const { jobs, onDelete, loading = false } = props;

  const columns = useMemo(() => getColumns(onDelete), []);

  function Empty() {
    return (
      <EmptyBody colSpan={columns.length}>
        <span>No jobs found</span>
      </EmptyBody>
    );
  }

  return (
    <div className="shadow-sm rounded my-6">
      <LoadingOverlay visible={loading} />
      <Table striped={true} className={`table-auto ${s.table}`}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.dataIndex}
                align={col.align ?? 'left'}
                className="group px-6 py-3 font-medium tracking-wider"
              >
                {col.title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {jobs.length === 0 && <Empty />}
          {jobs.map((job) => (
            <TableRow key={job.key} className="border-b">
              {columns.map((col) => (
                <TableCell key={col.dataIndex} className="p-4 whitespace-no-wrap">
                  {col.render ? col.render(job) : (job as any)[col.dataIndex]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

function jobsEqual(a: RepeatableJob, b: RepeatableJob) {
  if (a.key !== b.key) return false;
  return a.cron === b.cron || a.tz === b.tz || a.next == b.next;
}

// assume lists are sorted equally
function propsEqual(a: JobsTableProps, b: JobsTableProps) {
  if (a.jobs.length !== b.jobs.length) return false;
  for (let i = 0; i < a.jobs.length; i++) {
    if (!jobsEqual(a.jobs[i], b.jobs[i])) return false;
  }
  return true;
}

export const ScheduledJobsTable = React.memo(JobsTable, propsEqual);
