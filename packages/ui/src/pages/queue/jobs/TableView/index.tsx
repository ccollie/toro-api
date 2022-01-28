import { DbExclamationIcon } from 'src/components/Icons';
import { useJobsStore } from '@/stores';
import { useWhyDidYouUpdate } from 'src/hooks';
import { JobStatus } from 'src/types';
import shallow from 'zustand/shallow';
import { useRemoveJobSelectionOnUnmount } from 'src/pages/queue/jobs/hooks';
import React from 'react';
import { EmptyBody } from 'src/components/Table/EmptyBody';
import { TableWrapper } from 'src/components/Table/TableWrapper';
import { Cell, Header, JobColumnType, useColumns } from './columns';
import { Checkbox, Group, Text } from '@mantine/core';
import type { Job, JobFragment, Status } from 'src/types';

interface TableProps {
  queueId: string;
  status: Status;
  isReadOnly: boolean;
  jobs: Array<Job | JobFragment>;
  loading?: boolean;
  isSelected: (job: string) => boolean;
  toggleSelected: (id: string) => void;
  removeSelected: (id: string) => void;
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

  useRemoveJobSelectionOnUnmount(job.id, isSelected, removeSelected);
  return (
    <tr key={job.id}>
      <td className="border-dashed border-t border-gray-200 px-3" style={{ width: 18 }}>
        <label
          className="inline-flex justify-between items-center hover:bg-gray-200 px-2 py-2 rounded-lg cursor-pointer">
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
  const { jobs, queueId, status, isSelected, toggleSelected, removeSelected } = props;
  const columns = useColumns(queueId, status as JobStatus);
  const [selectedCount, clearSelected, setSelected] = useJobsStore(
    (state) => [state.selectedCount, state.clear, state.selectJobs],
    shallow
  );

  useWhyDidYouUpdate('TableView', props);

  const jobsLength = jobs?.length ?? 0;
  const hasJobs = jobsLength > 0;
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

  return (
    <TableWrapper>
      <table className="min-w-full divide-y divide-gray-200 bg-gray-100">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 sticky top-0 border-b border-gray-200 bg-gray-100">
              <label
                className="inline-flex justify-between items-center hover:bg-gray-200 py-2 cursor-pointer">
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
                isSelected={isSelected(job.id)}
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
