import { Tooltip } from '@mantine/core';
import { format, isToday } from 'date-fns';
import React from 'react';
import { formatDateTime, parseDate, relativeFormat } from 'src/lib';

const ONE_HOUR = 60 * 60 * 1000;

export const Timestamp = (
  {
    value,
    relative = false,
    className = '',
  }: {
    value: number | string;
    relative?: boolean;
    className?: string;
  }) => {
  if (!value) {
    return null;
  }

  const dt = parseDate(value);
  const _today = isToday(dt);
  const label = relativeFormat(dt);
  const time = format(dt, 'HH:mm:ss');

  let displayLabel = label;
  let displayValue: string;

  if (relative) {
    const diff = Math.abs(Date.now() - dt.getTime());
    if (diff > ONE_HOUR) {
      if (_today) {
        displayValue = time;
      } else {
        displayValue = formatDateTime(dt) ?? '';
      }
    } else {
      displayValue = label;
      displayLabel = formatDateTime(dt) ?? '';
    }
  } else {
    if (_today) {
      displayValue = time;
    } else {
      displayValue = formatDateTime(dt) ?? '';
    }
  }

  return (
    <Tooltip position="top" label={displayLabel} aria-label={displayLabel}>
      <span className={className}>{displayValue}</span>
    </Tooltip>
  );
};
