import { Box } from '@mantine/core';
import cx from 'clsx';
import React from 'react';
import { isEmpty } from 'src/lib';


export interface StatisticLabelProps {
  /** An element type to render as (string or function). */
  as?: React.ElementType<any>;

  /** Additional classes. */
  className?: string;

  /** Shorthand for primary content. */
  content?: React.ReactNode;
}

const defaultComponent = 'span';

/**
 * A statistic can contain a label to help provide context for the presented value.
 */
const StatisticLabel: React.FC<StatisticLabelProps> = (props) => {
  const { children, className, content, as = defaultComponent, ...rest } = props;
  const classes = cx('label', className);

  return (
    <Box component={as} {...rest} className={classes}>
      {isEmpty(children) ? content : children}
    </Box>
  );
};

export default StatisticLabel;
