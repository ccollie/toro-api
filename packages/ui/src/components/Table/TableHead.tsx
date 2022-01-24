import { Box, BoxProps, createStyles, MantineTheme } from '@mantine/core';
import { DefaultProps } from '@mantine/styles';
import React from 'react';
import Tablelvl2Context, { Tablelvl2ContextProps } from './Tablelvl2Context';

export const useStyles = createStyles((theme: MantineTheme) => ({
    root: {
      textAlign: 'left',
      display: 'table-header-group',
      textTransform: 'uppercase',
      bottomBorderWidth: '1px',
      fontSize: theme.fontSizes.sm,
      lineHeight: theme.lineHeight ?? '1.25em',
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
    }
  })
);

const tablelvl2: Tablelvl2ContextProps = {
  variant: 'head',
};

const defaultComponent = 'thead';

interface TableHeaderProps
  extends DefaultProps,
    React.ComponentPropsWithoutRef<'thead'> {
  component?: BoxProps<any>['component'];
}

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(function TableHeader(props, ref) {
  const { classes, cx } = useStyles();
  const { className, component = defaultComponent, children, ...other } = props;
  const cls = cx(classes.root, className);

  return (
    <Tablelvl2Context.Provider value={tablelvl2}>
      <Box component={component} className={cls} ref={ref} {...other}>
        {children}
      </Box>
    </Tablelvl2Context.Provider>
  );
});

export default TableHead;
