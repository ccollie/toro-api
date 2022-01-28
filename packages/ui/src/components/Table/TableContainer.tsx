import { Box, BoxProps, createStyles } from '@mantine/core';
import { DefaultProps } from '@mantine/styles';
import * as React from 'react';

const useStyles = createStyles(() => {
  return ({
    root: {
      width: '100%',
      overflowX: 'auto',
    },
  });
});

const defaultComponent = 'div';

interface TableBodyProps
  extends DefaultProps,
    React.ComponentPropsWithoutRef<'div'> {
  component?: BoxProps<any>['component'];
}

export const TableContainer = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody(props, ref) {
    const { classes, cx } = useStyles();
    const { className, component = defaultComponent, ...other } = props;

    return (
      <Box
        {...other}
        className={cx(classes.root, className)}
        component={component}
        ref={ref}
      />
    );
  },
);

export default TableContainer;
