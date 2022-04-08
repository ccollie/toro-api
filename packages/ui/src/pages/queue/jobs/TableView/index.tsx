import { DbExclamationIcon } from 'src/components/Icons';
import { useJobsStore } from '@/stores';
import { useWhyDidYouUpdate } from 'src/hooks';
import { JobSearchStatus, Queue } from 'src/types';
import shallow from 'zustand/shallow';
import { useRemoveJobSelectionOnUnmount } from '../hooks';
import React from 'react';
import { EmptyBody } from 'src/components/Table/EmptyBody';
import { TableWrapper } from 'src/components/Table/TableWrapper';
import { Cell, Header, JobColumnType, useColumns } from './columns';
import { Checkbox, Group, Text } from '@mantine/core';
import type { Job, JobFragment } from 'src/types';

interface TableProps {
  queue: Queue;
  status: JobSearchStatus;
  isReadOnly: boolean;
  jobs: Array<Job | JobFragment>;
  loading?: boolean;
}

function Empty({ colSpan }: { colSpan: number }) {
  return (
    <EmptyBody colSpan={colSpan}>
      <Group direction="column" spacing="xl">
        <DbExclamationIcon size="48" />
        <Text>No jobs found</Text>
      </Group>
    </EmptyBody>
  );
}

interface JobRowProps {
  job: JobFragment;
  columns: JobColumnType[];
  isSelected: boolean;
  toggleSelected: (id: string) => void;
  removeSelected: (id: string) => void;
}

function JobRow(props: JobRowProps) {
  const { job, columns, isSelected, removeSelected, toggleSelected } = props;

  const className =
    'inline-flex justify-between items-center hover:bg-gray-200 ' +
    'px-2 py-2 rounded-lg cursor-pointer';

  useRemoveJobSelectionOnUnmount(job.id, isSelected, removeSelected);

  return (
    <tr key={job.id}>
      <td className="border-dashed border-t border-gray-200 px-3" style={{ width: 18 }}>
        <label
          className={className}>
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelected(job.id)}
          />
        </label>
      </td>
      {columns.map((column) => (
        <Cell column={column} job={job} key={column.key} />
      ))}
    </tr>
  );
}

const InnerTableView: React.VFC<TableProps> = (props) => {
  const { jobs, queue, status } = props;
  const columns = useColumns(queue.id, status);
  const [
    selected,
    clearSelected,
    setSelected,
    removeSelected,
    toggleSelected,
  ] = useJobsStore(
    (state) => [
      state.selected,
      state.clear,
      state.selectJobs,
      state.unselectJob,
      state.toggleSelectJob
    ],
    shallow
  );

  useWhyDidYouUpdate('TableView', props);

  const jobsLength = jobs?.length ?? 0;
  const hasJobs = jobsLength > 0;
  const selectedCount = selected.size;
  const isIndeterminate = selectedCount > 0 && selectedCount !== jobsLength;
  const allChecked = hasJobs && selectedCount === jobsLength;

  const onSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked && jobs?.length) {
      setSelected(jobs);
    } else {
      clearSelected();
    }
  };

  function isSelected(job: JobFragment) {
    return selected.has(job.id);
  }

  const className =
    'inline-flex justify-between items-center ' +
    'hover:bg-gray-200 py-2 cursor-pointer';

  return (
    <TableWrapper>
      <table className="min-w-full divide-y divide-gray-200 bg-gray-100">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 sticky top-0 border-b border-gray-200 bg-gray-100">
              <label
                className={className}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={isIndeterminate}
                  onChange={onSelectAllChange}
                />
              </label>
            </th>
          {columns.map((column) => (
            <Header column={column} key={column.key} />
          ))}
        </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {jobsLength === 0 ? (
            <Empty colSpan={columns.length + 1} />
          ) : (
            jobs.map((job) => (
              <JobRow
                job={job}
                columns={columns}
                isSelected={isSelected(job)}
                removeSelected={removeSelected}
                toggleSelected={toggleSelected}
                key={job.id}/>
            ))
          )
          }
        </tbody>
      </table>
    </TableWrapper>
  );
};

export const TableView = React.memo(InnerTableView);
export default TableView;
