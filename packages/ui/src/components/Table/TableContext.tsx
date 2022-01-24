import * as React from 'react';
import { EnvConfig } from 'src/config';

export interface TableContextProps {
  stickyHeader: boolean;
}

const TableContext = React.createContext<TableContextProps | undefined>(undefined);

if (!EnvConfig.prod) {
  TableContext.displayName = 'TableContext';
}

export default TableContext;
