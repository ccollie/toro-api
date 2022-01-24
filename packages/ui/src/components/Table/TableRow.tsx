import { Box, MantineTheme } from '@mantine/core';
import { DefaultProps, createStyles } from '@mantine/styles';
import { PropsWithChildren } from 'react';
import * as React from 'react';
import Tablelvl2Context from './Tablelvl2Context';

const useStyles = createStyles( (theme: MantineTheme) => ({
  root: {
    color: 'inherit',
    display: 'table-row',
    verticalAlign: 'middle',
    flexDirection: 'row',
    alignItems: 'center',
    // We disable the focus ring for mouse, touch and keyboard users.
    outline: 0,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
  },
  head: {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    fontWeight: 500,
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    '&:hover $resizeHandle': {
      opacity: 1,
    },
  },
  body: {
    color: 'inherit',
    outline: 0,
    verticalAlign: 'middle',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.07)',
    },
    borderBottom: '1px solid rgba(224, 224, 224, 1)',
    '&:last-child': {
      borderBottom: 'none',
    },
    '&.selected': {
      backgroundColor: 'rgba(0, 0, 0, 0.04)',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.07)',
      },
    },
    '&.clickable': {
      cursor: 'pointer',
    },
  },
  footer: {}
}));

const defaultComponent = 'tr';

export type RowComponentType = 'tr' | 'thead' | 'tfoot';

interface TableRowProps
  extends DefaultProps,
    React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
  component?: RowComponentType;
}

/**
 * Will automatically set dynamic row height
 * based on the table element parent (head, body, etc).
 */
export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  props: PropsWithChildren<TableRowProps>,
  ref,
) {
  const { classes, cx } = useStyles();
  const {
    className,
    component = defaultComponent,
    selected = false,
    ...other
  } = props;
  const tablelvl2 = React.useContext(Tablelvl2Context);

  const head = tablelvl2?.variant === 'head';
  const footer = tablelvl2?.variant === 'footer';

  const extraClasses = [
    selected && 'selected',
    head && classes.head,
    footer && classes.footer,
    (!head && !footer) && classes.body,
  ];

  const cls = cx(classes.root, extraClasses, className);

  return (
    <Box
      {...other}
      component={component}
      ref={ref}
      className={cls}
    />
  );
});

export default TableRow;
