// tslint:disable:no-empty-interface
// no-empty-interface is disabled to allow easy extension with declaration merging

// tslint:disable:no-unnecessary-generics
// no-unnecessary-generics is disabled because many of these definitions are
// either used in a generic context or the signatures are required to match
// for declaration merging

// The changelog for the important changes is located in the Readme.md

import { HeaderProps } from '@mantine/core';
import { DefaultProps } from '@mantine/styles';
import {
  ChangeEvent,
  ComponentType,
  ReactElement,
  ReactFragment,
  ReactNode,
  ReactText,
} from 'react';

/**
 * The empty definitions of below provides a base definition for the parts used by useTable,
 * that can then be extended in the users code.
 *
 * @example
 *  export interface TableOptions<D extends Record<string, unknown> = {}}>
 *    extends
 *      UseExpandedOptions<D>,
 *      UseFiltersOptions<D> {}
 * see https://gist.github.com/ggascoigne/646e14c9d54258e40588a13aabf0102d for more details
 */
export interface TableOptions<D extends Record<string, unknown>>
  extends UseTableOptions<D> {}

export interface TableState<D extends Record<string, unknown> = any> {
  hiddenColumns?: Array<IdType<D>> | undefined;
}

export interface Cell<D extends Record<string, unknown> = any, V = any>
  extends UseTableCellProps<D, V> {}

export interface ColumnInterface<D extends Record<string, unknown> = any>
  extends UseTableColumnOptions<D> {}

export interface ColumnInterfaceBasedOnValue<
  D extends Record<string, unknown> = any,
  V = any,
> {
  Cell?: Renderer<CellProps<D, V>> | undefined;
}

export interface ColumnGroupInterface<D extends Record<string, unknown>> {
  columns: Array<Column<D>>;
}

export type ColumnGroup<D extends Record<string, unknown> = any> =
  ColumnInterface<D> &
    ColumnGroupInterface<D> &
    (
      | { Header: string }
      | ({ id: IdType<D> } & {
          Header: Renderer<HeaderProps<D>>;
        })
    ) & // Not used, but needed for backwards compatibility
    { accessor?: Accessor<D> | undefined };

type ValueOf<T> = T[keyof T];

// The accessors like `foo.bar` are not supported, use functions instead
export type ColumnWithStrictAccessor<D extends Record<string, unknown> = any> =
  ColumnInterface<D> &
    ValueOf<{
      [K in keyof D]: {
        accessor: K;
      } & ColumnInterfaceBasedOnValue<D, D[K]>;
    }>;

export type ColumnWithLooseAccessor<D extends Record<string, unknown> = any> =
  ColumnInterface<D> &
    ColumnInterfaceBasedOnValue<D> &
    (
      | { Header: string }
      | { id: IdType<D> }
      | { accessor: keyof D extends never ? IdType<D> : never }
    ) & {
      accessor?:
        | (keyof D extends never ? IdType<D> | Accessor<D> : Accessor<D>)
        | undefined;
    };

export type Column<D extends Record<string, unknown> = any> =
  | ColumnGroup<D>
  | ColumnWithLooseAccessor<D>
  | ColumnWithStrictAccessor<D>;

export interface ColumnInstance<D extends Record<string, unknown> = any>
  extends Omit<ColumnInterface<D>, 'id'>,
    ColumnInterfaceBasedOnValue<D>,
    UseTableColumnProps<D> {}

export interface Row<D extends Record<string, unknown> = any>
  extends UseTableRowProps<D> {}

export interface TableProps extends DefaultProps {}

export interface TableBodyProps extends DefaultProps {}

export interface TableKeyedProps extends DefaultProps {
  key: React.Key;
}

export interface TableRowProps extends TableKeyedProps {}

export interface TableCellProps extends TableKeyedProps {}

export interface TableToggleCommonProps extends DefaultProps {
  onChange?: ((e: ChangeEvent) => void) | undefined;
  checked?: boolean | undefined;
  title?: string | undefined;
  indeterminate?: boolean | undefined;
}

export interface MetaBase<D extends Record<string, unknown>> {
  instance: TableInstance<D>;
  userProps: any;
}

// inspired by ExtendState in  https://github.com/reduxjs/redux/blob/master/src/types/store.ts
export type Meta<
  D extends Record<string, unknown>,
  Extension = never,
  M = MetaBase<D>,
> = [Extension] extends [never] ? M : M & Extension;

/**
 * NOTE: To use custom options, use "Interface Merging" to add the custom options
 */
export type UseTableOptions<D extends Record<string, unknown>> = {
  columns: ReadonlyArray<Column<D>>;
  data: readonly D[];
} & Partial<{
  initialState: Partial<TableState<D>>;
  useControlledState: (state: TableState<D>, meta: Meta<D>) => TableState<D>;
  defaultColumn: Partial<Column<D>>;
  getRowId: (originalRow: D, relativeIndex: number, parent?: Row<D>) => string;
  autoResetHiddenColumns: boolean;
}>;

export type PropGetter<
  D extends Record<string, unknown>,
  Props,
  T extends Record<string, unknown> = never,
  P = Partial<Props>,
> = ((props: P, meta: Meta<D, T>) => P | P[]) | P | P[];

export type TablePropGetter<D extends Record<string, unknown>> = PropGetter<
  D,
  TableProps
>;

export type RowPropGetter<D extends Record<string, unknown>> = PropGetter<
  D,
  TableRowProps,
  { row: Row<D> }
>;

export type CellPropGetter<D extends Record<string, unknown>> = PropGetter<
  D,
  TableCellProps,
  { cell: Cell<D> }
>;

export interface UseTableColumnOptions<D extends Record<string, unknown>> {
  id?: IdType<D> | undefined;
  Header?: Renderer<HeaderProps<D>> | undefined;
  Footer?: Renderer<FooterProps<D>> | undefined;
  width?: number | string | undefined;
  minWidth?: number | undefined;
  maxWidth?: number | undefined;
}

export interface TableToggleHideAllColumnProps extends TableToggleCommonProps {}

export interface UseTableColumnProps<D extends Record<string, unknown>> {
  id: IdType<D>;
  columns?: Array<ColumnInstance<D>> | undefined;
  isVisible: boolean;
  render: (
    type: 'Header' | 'Footer' | string,
    props?: Record<string, unknown>,
  ) => ReactNode;
  totalLeft: number;
  totalWidth: number;
  toggleHidden: (value?: boolean) => void;
  parent?: ColumnInstance<D> | undefined; // not documented
  getToggleHiddenProps: (userProps?: any) => any;
  placeholderOf?: ColumnInstance | undefined;
}

export interface UseTableRowProps<D extends Record<string, unknown>> {
  cells: Array<Cell<D>>;
  allCells: Array<Cell<D>>;
  values: Record<IdType<D>, CellValue>;
  getRowProps: (propGetter?: RowPropGetter<D>) => TableRowProps;
  index: number;
  original: D;
  id: string;
}

export interface UseTableCellProps<D extends Record<string, unknown>, V = any> {
  column: ColumnInstance<D>;
  row: Row<D>;
  value: CellValue<V>;
  getCellProps: (propGetter?: CellPropGetter<D>) => TableCellProps;
  render: (
    type: 'Cell' | string,
    userProps?: Record<string, unknown>,
  ) => ReactNode;
}


export type CellProps<
  D extends Record<string, unknown>,
  V = any,
> = TableInstance<D> & {
  column: ColumnInstance<D>;
  row: Row<D>;
  cell: Cell<D, V>;
  value: CellValue<V>;
};

export type Accessor<D extends Record<string, unknown>> = (
  originalRow: D,
  index: number,
) => CellValue;

//#endregion

//#endregion

export interface TableToggleAllRowsSelectedProps
  extends TableToggleCommonProps {}

export interface TableToggleRowsSelectedProps extends TableToggleCommonProps {}

export interface UseRowSelectState<D extends Record<string, unknown>> {
  selectedRowIds: Record<IdType<D>, boolean>;
}

export interface UseRowSelectInstanceProps<D extends Record<string, unknown>> {
  toggleRowSelected: (rowId: IdType<D>, set?: boolean) => void;
  toggleAllRowsSelected: (value?: boolean) => void;
  getToggleAllRowsSelectedProps: (
    props?: Partial<TableToggleAllRowsSelectedProps>,
  ) => TableToggleAllRowsSelectedProps;
  getToggleAllPageRowsSelectedProps: (
    props?: Partial<TableToggleAllRowsSelectedProps>,
  ) => TableToggleAllRowsSelectedProps;
  isAllRowsSelected: boolean;
  selectedFlatRows: Array<Row<D>>;
}

export interface UseRowSelectRowProps {
  isSelected: boolean;
  isSomeSelected: boolean;
  toggleRowSelected: (set?: boolean) => void;
  getToggleRowSelectedProps: (
    props?: Partial<TableToggleRowsSelectedProps>,
  ) => TableToggleRowsSelectedProps;
}

//#endregion

//#region useRowState

export type UseRowUpdater<T = unknown> = T | ((prev: T) => T);
//#endregion

// Helpers
export type StringKey<D> = Extract<keyof D, string>;
export type IdType<D> = StringKey<D> | string;
export type CellValue<V = any> = V;

export type Renderer<Props> =
  | ComponentType<Props>
  | ReactElement
  | ReactText
  | ReactFragment;
