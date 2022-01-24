import React from 'react';
import { formatDate, relativeFormat } from '@/lib/dates';
import { Tooltip } from '@mantine/core';

interface RelativeDateFormatProps {
  value: number | Date | undefined;
  icon?: JSX.Element;
}

const RelativeDateFormat: React.FC<RelativeDateFormatProps> = (props) => {
  const { value, icon, children } = props;

  if (!value) {
    return <span></span>;
  }

  const label = relativeFormat(value);

  /**
   * Passing the icon as prop or children should work
   */
  const element = icon || children;
  const _children = React.isValidElement(element)
    ? React.cloneElement(element as any, {
        focusable: false,
      })
    : null;

  return (
    <Tooltip label={label} withArrow>
      {_children}
      <span>{formatDate(value)}</span>
    </Tooltip>
  );
};

export default RelativeDateFormat;
