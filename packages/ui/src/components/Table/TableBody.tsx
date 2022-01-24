import { BoxProps, Box, createStyles } from '@mantine/core';
import { DefaultProps } from '@mantine/styles';
import * as React from 'react';
import Tablelvl2Context, { Tablelvl2ContextProps } from './Tablelvl2Context';

const useStyles = createStyles(() => {
  return ({
    root: {
      display: 'table-row-group',
    },
  });
});

const tablelvl2: Tablelvl2ContextProps = {
  variant: 'body',
};

const defaultComponent = 'tbody';

interface TableBodyProps
  extends DefaultProps,
    React.ComponentPropsWithoutRef<'tbody'> {
  component?: BoxProps<any>['component'];
}

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  function TableBody(props, ref) {
    const { classes, cx } = useStyles();
    const { className, component = defaultComponent, ...other } = props;

    return (
      <Tablelvl2Context.Provider value={tablelvl2}>
        <Box
          {...other}
          className={cx(classes.root, className)}
          component={component}
          ref={ref}
        />
      </Tablelvl2Context.Provider>
    );
  },
);

export default TableBody;
