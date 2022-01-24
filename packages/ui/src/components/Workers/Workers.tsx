import { Badge, LoadingOverlay } from '@mantine/core';
import React from 'react';
import { QueueWorker } from '@/types';
import { formatDuration } from '@/lib';
import { RelativeDateFormat } from '@/components/RelativeDateFormat';
import { WorkerIcon } from '@/components/Icons';
import { EmptyBody, Table, TableRow, TableHead, TableBody, TableCell } from '@/components/Table';
import s from './workers.module.css';

interface WorkersProps {
  workers: QueueWorker[];
  loading?: boolean;
  onWorkerClick?: (worker: QueueWorker) => void;
}

function WorkerRow({
  worker,
  onClick,
}: {
  worker: QueueWorker;
  onClick?: (worker: QueueWorker) => void;
}) {
  const { id, name, idle, addr, started = 0 } = worker;

  const handleClick = (e: React.MouseEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    onClick?.(worker);
  };

  function IdleTime({ idle }: { idle: number }) {
    if (idle) {
      return (
        <Badge variant="filled">{formatDuration(idle)}</Badge>
      );
    }
    return <i className="i-la-ellipsis-h" />;
  }

  return (
    <TableRow
      className={`border-b ${s.tr}`}
      onClick={handleClick}
    >
      <TableCell align="center" className="p-3">
        <div className="ml-3">
          <div>{id}</div>
        </div>
      </TableCell>
      <TableCell className="p-3">{name}</TableCell>
      <TableCell className="p-3 font-bold">{addr}</TableCell>
      <TableCell className="p-3">
        {started && <RelativeDateFormat value={started} />}
      </TableCell>
      <TableCell align="center" className="p-3 m-w-3">
        <IdleTime idle={idle} />
      </TableCell>
    </TableRow>
  );
}

export const Workers = (props: WorkersProps) => {
  const { workers, onWorkerClick, loading = false } = props;

  return (
    <div className="col-span-12">
      <Table
        striped={true}
        className={`space-y-6 ${s.table}`}
      >
        <TableHead className="bg-gray-800 text-gray-500">
          <TableRow>
            <TableCell className="p-3">Id</TableCell>
            <TableCell className="p-3 text-left">Name</TableCell>
            <TableCell className="p-3 text-left">Address</TableCell>
            <TableCell className="p-3 text-left">Created</TableCell>
            <TableCell className="p-3 text-left">Idle</TableCell>
          </TableRow>
        </TableHead>
        {workers.length === 0 && !loading ? (
          <EmptyBody
            colSpan={5}
            description={'No workers found'}
            icon={<WorkerIcon size={64} />}
          />
        ) : (
          <TableBody>
            <LoadingOverlay visible={!!props.loading} />
            {workers.map((worker) => (
              <WorkerRow key={worker.id} worker={worker} onClick={onWorkerClick} />
            ))}
          </TableBody>
        )}
      </Table>
    </div>
  );
};

export default Workers;
