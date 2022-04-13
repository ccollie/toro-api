import { Box, MantineColor, MantineSize } from '@mantine/core';
import cx from 'clsx';
import React, { ReactNode } from 'react';
import { isEmpty } from 'src/lib';

import {
  useKeyOnly,
  useValueAndKey,
  useSizeProp
} from './utils';
import StatisticGroup from './StatisticGroup';
import StatisticLabel from './StatisticLabel';
import StatisticValue from './StatisticValue';

export const SIZES = ['mini', 'tiny', 'small', 'medium', 'large', 'big', 'huge'];
export const TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justified'];
export const VERTICAL_ALIGNMENTS = ['bottom', 'middle', 'top'];

export interface StatisticProps {
  /** An element type to render as (string or function). */
  as?: string;

  /** Additional classes. */
  className?: string;

  /** A statistic can be formatted to be different colors. */
  color?: MantineColor;

  /** Shorthand for primary content. */
  content?: ReactNode;

  /** A statistic can sit to the left or right of other content. */
  floated?: 'left' | 'right';

  /** A statistic can present its measurement horizontally. */
  horizontal?: boolean;

  /** A statistic can be formatted to fit on a dark background. */
  inverted?: boolean;

  /** Label content of the Statistic. */
  label?: ReactNode;

  /** A statistic can vary in size. */
  size?: MantineSize;

  /** Format the StatisticValue with smaller font size to fit nicely beside number values. */
  text?: boolean;

  /** Value content of the Statistic. */
  value?: ReactNode;
}

interface StatisticComponent extends React.FC<StatisticProps> {
  Group: typeof StatisticGroup;
  Label: typeof StatisticLabel;
  Value: typeof StatisticValue;
}

const defaultComponent = 'div';

/**
 * A statistic emphasizes the current value of an attribute.
 */
const Statistic: StatisticComponent = (props) => {
  const {
    children,
    className,
    color,
    content,
    floated,
    horizontal,
    inverted,
    label,
    size,
    text = false,
    value,
    as = defaultComponent,
    ...rest
  } = props;

  const classes = cx(
    'ui',
    color,
    useSizeProp(size),
    useValueAndKey(floated, 'floated'),
    useKeyOnly(horizontal, 'horizontal'),
    useKeyOnly(inverted, 'inverted'),
    'statistic',
    className,
  );

  if (!isEmpty(children)) {
    return (
      <Box {...rest} className={classes}>
        {children}
      </Box>
    );
  }
  if (!isEmpty(content)) {
    return (
      <Box {...rest} className={classes}>
        {content}
      </Box>
    );
  }

  return (
    <Box {...rest} className={classes}>
      {value && <StatisticValue text={text}>{value}</StatisticValue>}
      {label && <StatisticLabel>{label}</StatisticLabel>}
    </Box>
  );
};

Statistic.Group = StatisticGroup;
Statistic.Label = StatisticLabel;
Statistic.Value = StatisticValue;

export default Statistic;
