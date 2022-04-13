import { useJobsStore } from '@/stores';
import { Data, TableNode } from '@table-library/react-table-library';
import { Action, State, } from '@table-library/react-table-library/common';
import { CompactTable } from '@table-library/react-table-library/compact';
import { useRowSelect } from '@table-library/react-table-library/select';
import { useTheme } from '@table-library/react-table-library/theme';
import React, { useEffect, useState } from 'react';
import { TableWrapper } from 'src/components/Table/TableWrapper';
import { DEFAULT_OPTIONS, getTheme } from 'src/components/Table/themes/mantine';
import { useWhyDidYouUpdate } from 'src/hooks';
import useEffectOnce from 'src/hooks/use-effect-once';
import type { Job, JobFragment } from 'src/types';
import { JobSearchStatus, Queue } from 'src/types';
import shallow from 'zustand/shallow';
import { useColumns } from './columns';


interface TableProps {
  queue: Queue;
  status: JobSearchStatus;
  isReadOnly: boolean;
  jobs: Array<Job | JobFragment>;
  loading?: boolean;
}

const InnerTableView: React.VFC<TableProps> = (props) => {
  const { jobs, queue, status, loading } = props;
  const [data, setData] = useState<Data>({ nodes: [] });
  const [nodes, setNodes] = useState<TableNode[]>([]);

  useEffect(() => {
    if (!loading) {
      const nodes: TableNode[] = jobs.map(job => {
        return {
          id: job.id,
          job,
        };
      });
      setData({ nodes });
      setNodes(nodes);
    }
  }, [jobs, loading]);

  //* Theme *//

  const mantineTheme = getTheme({
    ...DEFAULT_OPTIONS,
    striped: true,
    highlightOnHover: true,
  });
  const customTheme = {
    Table: `
    width: 100%;
    margin: 16px 0px;
    `,
  };

  const theme = useTheme([mantineTheme, customTheme]);

  const [
    selected,
    clearSelected,
    setSelected,
  ] = useJobsStore(
    (state) => [
      state.selected,
      state.clear,
      state.selectJobs,
    ],
    shallow
  );

  const select = useRowSelect(data, {
    onChange: onSelectChange,
  });

  function onSelectChange(action: Action, state: State) {
    console.log(action, state);
    const ids = state.ids;
    if (Array.isArray(ids)) {
      if (ids.length === 0) {
        clearSelected();
      } else {
        setSelected(ids);
      }
    }
  }

  useEffectOnce(() => {
    selected.forEach(id => {
      select.fns.onAddById(id);
    });
  });

  const columns = useColumns(queue.id, status, select);

  useWhyDidYouUpdate('TableView', props);

  return (
    <TableWrapper>
      <CompactTable
        columns={columns}
        data={{ ...data, nodes }}
        theme={theme}
        select={select}
        loading={loading}
      />
    </TableWrapper>
  );
};

export const TableView = React.memo(InnerTableView);
export default TableView;
