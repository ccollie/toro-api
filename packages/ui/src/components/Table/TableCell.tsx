import { Box, BoxProps, MantineTheme } from '@mantine/core';
import { createStyles, DefaultProps } from '@mantine/styles';
import * as React from 'react';
import TableContext from './TableContext';
import Tablelvl2Context from './Tablelvl2Context';

export type TableCellVariant = 'head' | 'body' | 'footer';

export interface TableCellProps
  extends DefaultProps,
    React.HTMLAttributes<HTMLTableCellElement> {
  scope?: string;
  /**
   * The component used for the root node.
   * Either a string to use a DOM element or a component.
   */
  component?: BoxProps<any>['component'];
  /**
   * Set the text-align on the table cell content.
   *
   * Monetary or generally number fields **should be right aligned** as that allows
   * you to add them up quickly in your head without having to worry about decimals.
   * @default 'inherit'
   */
  align?: 'center' | 'inherit' | 'justify' | 'left' | 'right';
  /**
   * Specify the cell type.
   * The prop defaults to the value inherited from the parent
   * TableHead, TableBody, or TableFooter components.
   */
  variant?: TableCellVariant;

  /**
   * Sets the padding applied to the cell.
   * The prop defaults to the value (`'default'`) inherited from the parent Table component.
   */
  padding?: 'checkbox' | 'none' | 'normal';

  /**
   * Set aria-sort direction.
   */
  sortDirection?: 'asc' | 'desc' | false;

  selected?: boolean;

  clickable?: boolean;

  stickyHeader?: boolean;
}

const useStyles = createStyles(
  (theme: MantineTheme, params: TableCellProps) => ({
    root: {
      display: 'table-cell',
      verticalAlign: 'inherit',
      lineHeight: theme.lineHeight,
      borderBottom: `1px solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]
      }`,
      textAlign: 'left',
      padding: 16,
      ...(params.clickable && {
        cursor: 'pointer',
      }),
      ...(params.variant === 'head' && {
        fontSize: 14,
        color: theme.colorScheme === 'dark' ? theme.colors.gray[2] : theme.colors.gray[7],
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[3],
      }),
      ...(params.variant === 'body' && {
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
      }),
      ...(params.variant === 'footer' && {
        fontWeight: 'bold',
        fontSize: 14,
        color: theme.colorScheme === 'dark' ? theme.colors.gray[2] : theme.colors.gray[7],
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[3],
      }),
      ...(params.padding === 'checkbox' && {
        width: 48, // prevent the checkbox column from growing
        padding: '0 0 0 4px',
      }),
      ...(params.padding === 'none' && {
        padding: 0,
      }),
      ...(params.align === 'left' && {
        textAlign: 'left',
      }),
      ...(params.align === 'center' && {
        textAlign: 'center',
      }),
      ...(params.align === 'right' && {
        textAlign: 'right',
        flexDirection: 'row-reverse',
      }),
      ...(params.align === 'justify' && {
        textAlign: 'justify',
      }),
      ...(params.stickyHeader && {
        position: 'sticky',
        top: 0,
        zIndex: 2,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],
      }),
    },
  }),
);
/**
 * The component renders a `<th>` element when the parent context is a header
 * or otherwise a `<td>` element.
 */
export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  function TableCell(props, ref) {
    const {
      className,
      component: componentProp,
      scope: scopeProp,
      sortDirection,
      variant: variantProp = 'body',
      ...other
    } = props;

    const table = React.useContext(TableContext);
    const tablelvl2 = React.useContext(Tablelvl2Context);

    const isHeadCell = tablelvl2 && tablelvl2.variant === 'head';

    let component;
    if (componentProp) {
      component = componentProp;
    } else {
      component = isHeadCell ? 'th' : 'td';
    }

    let scope = scopeProp;
    if (!scope && isHeadCell) {
      scope = 'col';
    }

    const variant = variantProp || (tablelvl2 && tablelvl2.variant);

    let ariaSort = null;
    if (sortDirection) {
      ariaSort = sortDirection === 'asc' ? 'ascending' : 'descending';
    }

    const _props = {
      ...props,
      stickyHeader: props.stickyHeader ?? (variant === 'head' && table?.stickyHeader)
    };

    const { classes, cx } = useStyles(_props);

    const cls=cx(
      classes.root,
      className
    );

    return (
      <Box
        component={component}
        ref={ref}
        className={cls}
        aria-sort={ariaSort}
        scope={scope}
        {...other}
      />
    );
  },
);

export default TableCell;
