import { Data, TableNode } from '@table-library/react-table-library';
import {
  DEFAULT_OPTIONS,
  getTheme,
} from '@/components/Table/themes/mantine';
import { parseJSON } from 'date-fns';
import { Fragment, useCallback, useEffect, useMemo } from 'react';
import * as React from 'react';

import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import { useRowSelect } from '@table-library/react-table-library/select';
import { usePagination } from '@table-library/react-table-library/pagination';
import {
  Action, State,
} from '@table-library/react-table-library/common';
import {
  Group,
  Checkbox,
  Pagination,
  Tooltip,
} from '@mantine/core';
import { RelativeDateFormat } from 'src/components';
import { CalendarIcon, TrashIcon } from 'src/components/Icons';
import { Timestamp } from 'src/components/Timestamp';
import { normalizeJobName } from 'src/lib';
import JobId from '../jobs/JobId';
import { ActionIcon } from 'src/components/ActionIcon';
import { RepeatableJob } from 'src/types';

type JobsTableProps = {
  jobs: RepeatableJob[];
  loading?: boolean;
  isReadonly?: boolean;
  onDelete: DeleteFunction;
};

type DeleteFunction = (key: string) => Promise<void>;

function DeleteIcon({
                      jobKey,
                      onDelete,
                    }: {
  jobKey: string;
  onDelete: DeleteFunction;
}) {
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

export const ScheduledJobsTable = (props: JobsTableProps) => {
  const { jobs, loading, onDelete, isReadonly } = props;
  const [data, setData] = React.useState<Data>({ nodes: [] });
  const [nodes, setNodes] = React.useState<TableNode[]>([]);

  useEffect(() => {
    if (!loading) {
      const nodes: TableNode[] = jobs.map(job => {
        const v = {
          id: job.key,
          job,
        };
        return v;
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

  //* Resize *//
  const resize = { resizerHighlight: '#dee2e6' };

  //* Pagination *//

  const pagination = usePagination(data, {
    state: {
      page: 0,
      size: 4,
    },
    onChange: onPaginationChange,
  });

  function onPaginationChange(action: Action, state: State) {
    console.log(action, state);
  }

  //* Select *//

  const select = useRowSelect(data, {
    onChange: onSelectChange,
  });

  function onSelectChange(action: Action, state: State) {
    console.log(action, state);
  }

  const columns = useMemo(() => {

    const COLUMNS = [
      {
        label: 'Key',
        renderCell: (node: TableNode) => {
          const job = node.job as RepeatableJob;
          const key = job.key;
          return (
            <Tooltip label={key} aria-label="Job key">
              <span>{key}</span>
            </Tooltip>
          );
        },
        resize,
        select: {
          renderHeaderCellSelect: () => (
            <Checkbox
              checked={select.state.all}
              indeterminate={!select.state.all && !select.state.none}
              onChange={select.fns.onToggleAll}
            />
          ),
          renderCellSelect: (item: TableNode) => (
            <Checkbox
              checked={select.state.ids.includes(item.job.key)}
              onChange={() => select.fns.onToggleById(item.job.key)}
            />
          ),
        },
      },
      {
        label: 'Id',
        renderCell: (node: TableNode) => {
          const job = node.job as RepeatableJob;
          return <JobId id={job.id ?? ''}/>;
        },
        resize,
      },
      {
        label: 'Job Name',
        renderCell: (node: TableNode) => (
          <Fragment>{normalizeJobName(node.job)}</Fragment>
        ),
        resize,
      },
      {
        label: 'End Date',
        renderCell: (node: TableNode) => {
          const job = node.job as RepeatableJob;
          const val = job.endDate ? parseJSON(job.endDate as any) : null;
          if (val) {
            return <RelativeDateFormat value={val} icon={<CalendarIcon />} />;
          }
          return <></>;
        },
        resize,
      },
      {
        label: 'CRON',
        renderCell: (node: TableNode) => (
          <Tooltip position="top" withArrow label={node.job.descr}>
            <span>{node.job.cron}</span>
          </Tooltip>
        ),
        resize
      },
      {
        label: 'Next',
        renderCell: (node: TableNode) => (
          <Timestamp value={node.job.next} relative={true}/>
        ),
        resize,
      },
      {
        label: 'Timezone',
        renderCell: (node: TableNode) => <span>{node.job.tz}</span>,
        resize,
      },
    ];

    if (!isReadonly) {
      COLUMNS.push({
        label: 'Actions',
        renderCell: (node: TableNode) => (
          <Fragment>
            <DeleteIcon jobKey={node.job.key} onDelete={onDelete} />
          </Fragment>
        ),
        resize,
      });
    }

    return COLUMNS;
  }, [isReadonly, select]);


  return (
    <>
      {/* Table */}

      <CompactTable
        columns={columns}
        data={{ ...data, nodes }}
        theme={theme}
        select={select}
        pagination={pagination}
      />

      {(jobs.length > 10) && (
        <Group position="right" mx={10}>
          <Pagination
            total={pagination.state.getTotalPages(nodes.length)}
            page={pagination.state.page + 1}
            onChange={(page) => pagination.fns.onSetPage(page - 1)}
          />
        </Group>
      )}
    </>
  );
};
