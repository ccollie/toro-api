import { Badge, LoadingOverlay } from '@mantine/core';
import { Data, TableNode } from '@table-library/react-table-library';
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import {
  DEFAULT_OPTIONS,
  getTheme,
} from '@/components/Table/themes/mantine';
import React, { useEffect } from 'react';
import { QueueWorker } from '@/types';
import { formatDuration } from '@/lib';
import { RelativeDateFormat } from '@/components/RelativeDateFormat';

interface WorkersProps {
  workers: QueueWorker[];
  loading?: boolean;
  onWorkerClick?: (worker: QueueWorker) => void;
}

function IdleTime({ idle }: { idle: number }) {
  if (idle) {
    return <Badge variant="filled">{formatDuration(idle)}</Badge>;
  }
  return <i className="i-la-ellipsis-h" />;
}

export const Workers = (props: WorkersProps) => {
  const { workers, loading = false } = props;
  const [data, setData] = React.useState<Data>({ nodes: [] });

  useEffect(() => {
    const nodes = workers.map((worker) => {
      const { id, name, idle, addr, started = 0 } = worker;
      return {
        id,
        name,
        idle,
        addr,
        started,
      } as TableNode;
    });
    setData({ nodes });
  }, [workers]);

  const mantineTheme = getTheme({
    ...DEFAULT_OPTIONS,
    striped: true,
    highlightOnHover: true,
  });
  const customTheme = {
    Table: `
    width: 100%;
    margin: 16px 0px;
    border-spacing: 0 15px;
    `,
  };
  const theme = useTheme([mantineTheme, customTheme]);

  //* Resize *//
  const resize = { resizerHighlight: '#dee2e6' };

  const columns = [
    {
      label: 'ID',
      resize,
      renderCell: (node: TableNode) => (
        <span className="text-left p-3">{node.id}</span>
      ),
    },
    {
      label: 'Name',
      renderCell: (node: TableNode) => (
        <div className="text-left p-3">{node.name}</div>
      ),
    },
    {
      label: 'Address',
      renderCell: (node: TableNode) => <div>{node.addr}</div>,
    },
    {
      label: 'Started',
      renderCell: (node: TableNode) => {
        return node.started && <RelativeDateFormat value={node.started} />;
      },
    },
    {
      label: 'Idle',
      renderCell: (node: TableNode) => (
        <span className="text-center p-3 m-w-3">
          <IdleTime idle={node.idle} />
        </span>
      ),
    },
  ];

  return (
    <div className="col-span-12">
      {/* Table */}
      <LoadingOverlay visible={loading} />
      <CompactTable
        columns={columns}
        data={data}
        theme={theme}
      />
    </div>
  );
};

export default Workers;
