import { DbExclamationIcon } from 'src/components/Icons';
import { useJobsStore } from '@/stores';
import { useWhyDidYouUpdate } from 'src/hooks';
import shallow from 'zustand/shallow';
import { useRemoveSelectionOnUnmount } from '@/hooks';
import React from 'react';
import { EmptyBody } from 'src/components/Table/EmptyBody';
import { TableWrapper } from 'src/components/Table/TableWrapper';
import { Cell, Header, MetricColumnType, MetricsColumns } from './columns';
import { Checkbox, Group, Text } from '@mantine/core';
import type { MetricFragment } from 'src/types';

interface TableProps {
  queueId: string;
  isReadOnly: boolean;
  metrics: Array<MetricFragment>;
  loading?: boolean;
  isSelected: (metric: string) => boolean;
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

interface MetricRowProps {
  metric: MetricFragment;
  columns: MetricColumnType[];
  isSelected: boolean;
  toggleSelected: (id: string) => void;
  removeSelected: (id: string) => void;
}

function MetricRow(props: MetricRowProps) {
  const { metric, columns, isSelected, removeSelected, toggleSelected } = props;

  useRemoveSelectionOnUnmount(metric.id, isSelected, removeSelected);
  return (
    <tr key={metric.id}>
      <td className="border-dashed border-t border-gray-200 px-3" style={{ width: 18 }}>
        <label
          className="inline-flex justify-between items-center hover:bg-gray-200 px-2 py-2 rounded-lg cursor-pointer">
          <Checkbox
            checked={isSelected}
            onChange={() => toggleSelected(metric.id)}
          />
        </label>
      </td>
      {columns.map((column) => (
        <Cell column={column} metric={metric} key={column.title} />
      ))}
    </tr>
  );
}

const InnerTableView: React.VFC<TableProps> = (props) => {
  const { metrics, queueId, isSelected, toggleSelected, removeSelected } = props;
  const [selectedCount, clearSelected, setSelected] = useJobsStore(
    (state) => [state.selectedCount, state.clear, state.selectJobs],
    shallow
  );

  useWhyDidYouUpdate('TableView', props);

  const metricsLength = metrics?.length ?? 0;
  const hasJobs = metricsLength > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount !== metricsLength;
  const allChecked = hasJobs && selectedCount === metricsLength;

  const onSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked && metrics?.length) {
      setSelected(metrics);
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
          <th>

          </th>
          {MetricsColumns.map((column) => (
            <Header column={column} key={column.title} />
          ))}
        </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
        {metricsLength === 0 ? (
          <Empty colSpan={MetricsColumns.length + 1} />
        ) : (
          metrics.map((metric) => (
            <MetricRow
              metric={metric}
              columns={MetricsColumns}
              isSelected={isSelected(metric.id)}
              removeSelected={removeSelected}
              toggleSelected={toggleSelected}
              key={metric.id}/>
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
