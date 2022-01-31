import { Box } from '@mantine/core';
import cx from 'clsx';
import React, { ReactNode } from 'react';
import { isEmpty } from 'src/lib';

interface StatisticValueProps {
  /** An element type to render as (string or function). */
  as?: React.ElementType;

  /** Additional classes. */
  className?: string;

  /** Shorthand for primary content. */
  content?: ReactNode;

  /** Format the value with smaller font size to fit nicely beside number values. */
  text?: boolean;
}

const defaultComponent = 'div';

/**
 * A statistic can contain a numeric, icon, image, or text value.
 */
const StatisticValue: React.FC<StatisticValueProps> = (props) => {
  const { children, className, content, text, as = defaultComponent, ...rest } = props;

  const classes = cx([text ? 'text' : ''], 'value', className);

  return (
    <Box component={as} {...rest} className={classes}>
      {isEmpty(children) ? content : children}
    </Box>
  );
};

export default StatisticValue;
