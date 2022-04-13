import { Checkbox } from '@mantine/core';
import { Action, State } from '@table-library/react-table-library/common';
import { useRowSelect } from '@table-library/react-table-library/select';
import React, { useMemo } from 'react';
import { TableNode } from '@table-library/react-table-library';
import { CompactTable } from '@table-library/react-table-library/compact';
import { useTheme } from '@table-library/react-table-library/theme';
import {
  DEFAULT_OPTIONS,
  getTheme,
} from '@/components/Table/themes/mantine';

export const JobFields = [
  {
    id: 'id',
    title: 'Id',
    description: 'Job Id',
  },
  {
    id: 'name',
    title: 'Job Name',
    description: 'The name of the Job',
  },
  {
    id: 'timestamp',
    title: 'Timestamp',
    description: 'Job creation timestamp',
  },
  {
    id: 'data',
    title: 'Data',
    description: 'The job data',
  },
  {
    id: 'opts',
    title: 'Options',
    description: 'The job options',
  },
  {
    id: 'attemptsMade',
    title: 'Attempts Made',
    description: 'Job attempts',
  },
  {
    id: 'processedOn',
    title: 'Processed On',
    description: 'A timestamp of when the job started executing',
  },
  {
    id: 'finishedOn',
    title: 'Finished On',
    description: 'The timestamp of when the job finished executing',
  },
  {
    id: 'failedReason',
    title: 'Failed Reason',
    description: 'The reason the job failed',
  },
  {
    id: 'stackTrace',
    title: 'Stacktrace',
    description: 'Error stack',
  },
  {
    id: 'returnvalue',
    title: 'Return Value',
    description: 'The value returned from the job',
  },
];

//* Resize *//
const resize = { resizerHighlight: '#dee2e6' };

export const AllFieldNames = JobFields.map(x => x.id);

interface TProps {
  height?: number;
  onChange?: (fields: string[]) => void;
}

export const FieldList: React.FC<TProps> = (props) => {
  const data = { nodes: JobFields };

  const mantineTheme = getTheme({
    ...DEFAULT_OPTIONS,
    highlightOnHover: true,
  });
  const customTheme = {
    Table: `
    height: ${props.height ?? 250}px;
    width: 100%;
    margin: 16px 0px;
    `,
  };

  const theme = useTheme([mantineTheme, customTheme]);

  const select = useRowSelect(data, {
    onChange: onSelectChange,
  });

  function onSelectChange(action: Action, state: State) {
    console.log(action, state);
    const ids = new Set<string>((state as any).ids);
    props.onChange?.(Array.from(ids));
  }

  const columns = useMemo(() => [
    {
      label: 'Field',
      renderCell: (n: TableNode) => <div>n.title</div>,
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
            checked={select.state.ids.includes(item.id)}
            onChange={() => select.fns.onToggleById(item.id)}
          />
        ),
      },
    },
    {
      label: 'Description',
      renderCell: (node: TableNode) => <div>node.description</div>,
      resize,
    },
  ], [select]);

  return (
    <div style={{
      height: `${props.height ?? 250}px`
    }}>
      <CompactTable
        columns={columns}
        data={data}
        theme={theme}
        select={select}
      />
    </div>
  );
};
