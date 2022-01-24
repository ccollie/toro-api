import { Table as TableInner, TableProps as InnerTableProps } from '@mantine/core';
import * as React from 'react';
import TableContext from './TableContext';

interface TableProps extends InnerTableProps {
  stickyHeader?: boolean;
}

export const Table: React.FC<TableProps> = (props) => {
  const {
    stickyHeader = false,
    ...other
  } = props;

  const table = React.useMemo(
    () => ({ stickyHeader }),
    [stickyHeader],
  );

  const sx = stickyHeader ? { borderCollapse: 'separate' } : undefined;

  return (
    <TableContext.Provider value={table}>
      <TableInner
        {...other}
        styles={sx}
      />
    </TableContext.Provider>
  );
};

export default Table;
