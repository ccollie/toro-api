import { Box, MantineColor, MantineSize } from '@mantine/core';
import cx from 'clsx';
import React from 'react';
import { isEmpty } from 'src/lib';

import { useKeyOnly, useWidthProp, useSizeProp } from './utils';
import Statistic from './Statistic';

export interface GroupItemProps {
  label: string;
  value: React.ReactNode;
}

export interface StatisticGroupProps {
  /** An element type to render as (string or function). */
  as?: React.ElementType<any>;

  /** Primary content. */
  children?: React.ReactNode;

  /** Additional classes. */
  className?: string;

  /** A statistic group can be formatted to be different colors. */
  color?: MantineColor;

  /** Shorthand for primary content. */
  content?: React.ReactNode;

  /** A statistic group can present its measurement horizontally. */
  horizontal?: boolean;

  /** A statistic group can present its measurement horizontally. */
  inverted?: boolean;

  /** Array of props for Statistic. */
  items?: GroupItemProps[];

  /** A statistic group can vary in size. */
  size?: MantineSize;

  /** A statistic group can have its items divided evenly. */
  widths?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

const defaultComponent = 'div';

/**
 * A group of statistics.
 */
const StatisticGroup: React.FC<StatisticGroupProps> = (props) => {
  const {
    children,
    className,
    color,
    content,
    horizontal,
    inverted,
    items,
    size,
    widths,
    as = defaultComponent,
    ...rest
  } = props;

  const classes = cx(
    'ui',
    color,
    useSizeProp(size),
    useKeyOnly(horizontal, 'horizontal'),
    useKeyOnly(inverted, 'inverted'),
    useWidthProp(widths),
    'statistics',
    className,
  );


  if (!isEmpty(children)) {
    return (
      <Box component={as} {...rest} className={classes}>
        {children}
      </Box>
    );
  }
  if (!isEmpty(content)) {
    return (
      <Box component={as} {...rest} className={classes}>
        {content}
      </Box>
    );
  }

  return (
    <Box component={as} {...rest} className={classes}>
      {items?.map((item) =>
        <Statistic key={item.label} label={item.label} value={item.value} />
      )}
    </Box>
  );
};

export default StatisticGroup;
